import type { APIRoute } from "astro";
import { provisionInstance } from "../../lib/gcp";
import { sendOnboardingEmail } from "../../lib/email";
import { createInstance } from "../../lib/registry";
import { generateGatewayToken, hashToken, encrypt } from "../../lib/security";
import { createVirtualKey } from "../../lib/litellm";

const API_SECRET = import.meta.env.API_SECRET || process.env.API_SECRET;
const DEFAULT_API_KEY =
  import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";

export const POST: APIRoute = async ({ request }) => {
  // Authenticate
  const authHeader = request.headers.get("authorization");
  if (!API_SECRET || authHeader !== `Bearer ${API_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { name?: string; email?: string; plan?: string; apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, email, plan } = body;
  if (!name || !email || !plan) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: name, email, plan" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Generate a safe instance name from the user's name
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const instanceName = `moes-${sanitizedName}-${Date.now().toString(36)}`;

  // Generate gateway token
  const gatewayToken = generateGatewayToken();
  const tokenHash = hashToken(gatewayToken);

  // Create LiteLLM virtual key for managed API access
  let litellmKey: { key: string; token: string } | null = null;
  let apiKey = body.apiKey || "";

  if (!apiKey) {
    // No user-provided key — create a LiteLLM virtual key
    try {
      litellmKey = await createVirtualKey(instanceName, plan, email);
      apiKey = litellmKey.key;
    } catch (err) {
      console.error("LiteLLM key creation failed, falling back to default:", err);
      apiKey = DEFAULT_API_KEY;
    }
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "No API key configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Provision the GCP instance
    const result = await provisionInstance(instanceName, apiKey);

    // Register in Supabase
    try {
      await createInstance({
        customer_email: email,
        customer_name: name,
        instance_name: instanceName,
        gcp_instance_id: result.instanceName,
        external_ip: result.externalIp,
        gateway_token_hash: tokenHash,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        plan,
        status: "active",
        model: plan === "starter" ? "anthropic/claude-haiku-4-5" : "anthropic/claude-sonnet-4-6",
        region: "northamerica-northeast1-a",
        litellm_key_id: litellmKey?.token || null,
        litellm_virtual_key: litellmKey?.key || null,
      });
    } catch (err) {
      console.error("Failed to register instance in registry:", err);
      // Don't fail the request — instance is already provisioned
    }

    // Store user-provided API key encrypted if they brought their own
    if (body.apiKey) {
      try {
        const { storeApiKey } = await import("../../lib/registry");
        await storeApiKey({
          instance_id: instanceName, // Will be replaced with actual UUID from registry
          provider: "anthropic",
          key_hash: encrypt(body.apiKey),
        });
      } catch (err) {
        console.error("Failed to store API key:", err);
      }
    }

    // Send onboarding email
    await sendOnboardingEmail({
      recipientEmail: email,
      recipientName: name,
      dashboardUrl: result.dashboardUrl,
      gatewayToken,
      instanceIp: result.externalIp,
      plan,
    });

    return new Response(
      JSON.stringify({
        success: true,
        instanceName: result.instanceName,
        ip: result.externalIp,
        token: gatewayToken,
        dashboardUrl: result.dashboardUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Provision failed:", message);
    return new Response(
      JSON.stringify({ error: "Provisioning failed", detail: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
