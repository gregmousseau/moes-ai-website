import { InstancesClient, ZoneOperationsClient } from "@google-cloud/compute";
import crypto from "crypto";

const PROJECT_ID = "moes-502f7";
const ZONE = "northamerica-northeast1-a";
const MACHINE_TYPE = `zones/${ZONE}/machineTypes/e2-small`;
const SOURCE_IMAGE =
  "projects/debian-cloud/global/images/family/debian-12";
const DISK_SIZE_GB = 20;
const NETWORK_TAG = "openclaw";

function getCredentials() {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GCP_SERVICE_ACCOUNT_KEY env var is not set");
  return JSON.parse(raw);
}

function getClients() {
  const credentials = getCredentials();
  const instances = new InstancesClient({ credentials, projectId: PROJECT_ID });
  const zoneOps = new ZoneOperationsClient({ credentials, projectId: PROJECT_ID });
  return { instances, zoneOps };
}

export function generateGatewayToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function buildStartupScript(gatewayToken: string, apiKey: string): string {
  return `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

LOG="/var/log/openclaw-setup.log"
exec > >(tee -a "\$LOG") 2>&1
echo "=== OpenClaw setup started at \$(date) ==="

# System updates
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install OpenClaw globally
npm install -g openclaw

# Create openclaw user
if ! id openclaw &>/dev/null; then
  useradd -m -s /bin/bash openclaw
fi

# Setup directories
sudo -u openclaw mkdir -p /home/openclaw/.openclaw/workspace

# Write gateway config
cat > /home/openclaw/.openclaw/config.yaml << 'CFGEOF'
gateway:
  token: "${gatewayToken}"
  bind: "lan"
  controlUi:
    allowInsecureAuth: true
  channels:
    whatsapp:
      enabled: true
  groupPolicy: "open"
  models:
    - id: "anthropic/claude-sonnet-4-6"
      provider: "anthropic"
      apiKey: "${apiKey}"
      default: true
CFGEOF

chown openclaw:openclaw /home/openclaw/.openclaw/config.yaml

# Create systemd service
cat > /etc/systemd/system/openclaw.service << 'SVCEOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw
ExecStart=/usr/bin/node /usr/lib/node_modules/openclaw/dist/entry.js gateway run
Restart=always
RestartSec=5
Environment=HOME=/home/openclaw
Environment=NODE_ENV=production
Environment=XDG_CONFIG_HOME=/home/openclaw/.openclaw

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable openclaw
systemctl start openclaw

echo "=== OpenClaw setup completed at \$(date) ==="
`;
}

export interface ProvisionResult {
  instanceName: string;
  externalIp: string;
  gatewayToken: string;
  dashboardUrl: string;
}

export async function provisionInstance(
  instanceName: string,
  apiKey: string,
): Promise<ProvisionResult> {
  const { instances, zoneOps } = getClients();
  const gatewayToken = generateGatewayToken();
  const startupScript = buildStartupScript(gatewayToken, apiKey);

  // Create the instance
  const [operation] = await instances.insert({
    project: PROJECT_ID,
    zone: ZONE,
    instanceResource: {
      name: instanceName,
      machineType: MACHINE_TYPE,
      tags: { items: [NETWORK_TAG] },
      disks: [
        {
          boot: true,
          autoDelete: true,
          initializeParams: {
            diskSizeGb: String(DISK_SIZE_GB),
            sourceImage: SOURCE_IMAGE,
          },
        },
      ],
      networkInterfaces: [
        {
          accessConfigs: [
            {
              name: "External NAT",
              type: "ONE_TO_ONE_NAT",
            },
          ],
        },
      ],
      metadata: {
        items: [
          {
            key: "startup-script",
            value: startupScript,
          },
        ],
      },
    },
  });

  // Wait for instance creation to complete
  if (operation.latestResponse) {
    const op = operation.latestResponse as { name?: string; status?: string };
    if (op.name && op.status !== "DONE") {
      await waitForOperation(zoneOps, op.name);
    }
  }

  // Get the instance to find its external IP
  const externalIp = await pollForExternalIp(instances, instanceName);

  const dashboardUrl = `http://${externalIp}:18789`;

  return {
    instanceName,
    externalIp,
    gatewayToken,
    dashboardUrl,
  };
}

async function waitForOperation(
  zoneOps: ZoneOperationsClient,
  operationName: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [op] = await zoneOps.get({
      project: PROJECT_ID,
      zone: ZONE,
      operation: operationName,
    });
    if (op.status === "DONE") {
      if (op.error?.errors?.length) {
        throw new Error(
          `GCP operation failed: ${op.error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      return;
    }
    await sleep(3000);
  }
  throw new Error("Timed out waiting for GCP operation");
}

async function pollForExternalIp(
  instances: InstancesClient,
  instanceName: string,
  timeoutMs = 60_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [instance] = await instances.get({
      project: PROJECT_ID,
      zone: ZONE,
      instance: instanceName,
    });
    const ip =
      instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP;
    if (ip) return ip;
    await sleep(3000);
  }
  throw new Error("Timed out waiting for external IP");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
