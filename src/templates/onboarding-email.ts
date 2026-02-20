import type { OnboardingEmailData } from "../lib/email";

export function buildOnboardingEmail(data: OnboardingEmailData): string {
  const { recipientName, dashboardUrl, gatewayToken, instanceIp, plan } = data;
  const firstName = recipientName.split(" ")[0] || "there";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Moe's AI is Ready</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0e1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0; text-align:center;">
              <span style="font-size:28px; font-weight:700; color:#ffffff;">moes<span style="color:#3b82f6;">.ai</span></span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#111827; border-radius:16px; padding:40px; border:1px solid #1e293b;">

              <!-- Greeting -->
              <h1 style="margin:0 0 8px 0; font-size:24px; font-weight:700; color:#ffffff;">
                Hey ${firstName}! Your AI assistant is live.
              </h1>
              <p style="margin:0 0 32px 0; font-size:16px; color:#94a3b8; line-height:1.6;">
                Your <strong style="color:#3b82f6;">${plan}</strong> instance has been provisioned and is ready to go.
              </p>

              <!-- Dashboard Link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e293b; border-radius:12px; padding:24px; margin-bottom:24px;">
                    <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
                      Your Dashboard
                    </p>
                    <a href="${dashboardUrl}" style="font-size:18px; color:#3b82f6; text-decoration:none; word-break:break-all;">
                      ${dashboardUrl}
                    </a>
                  </td>
                </tr>
              </table>

              <div style="height:16px;"></div>

              <!-- Access Token -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e293b; border-radius:12px; padding:24px;">
                    <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
                      Access Token
                    </p>
                    <code style="font-size:14px; color:#f1f5f9; font-family:'Courier New',monospace; word-break:break-all;">
                      ${gatewayToken}
                    </code>
                    <p style="margin:12px 0 0 0; font-size:13px; color:#64748b;">
                      Use this token when prompted to log in to your dashboard.
                    </p>
                  </td>
                </tr>
              </table>

              <div style="height:16px;"></div>

              <!-- Instance Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#1e293b; border-radius:12px; padding:24px;">
                    <p style="margin:0 0 8px 0; font-size:13px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
                      Instance Details
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px; color:#e2e8f0;">
                      <tr>
                        <td style="padding:4px 16px 4px 0; color:#94a3b8;">IP Address</td>
                        <td style="padding:4px 0; font-family:'Courier New',monospace;">${instanceIp}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 16px 4px 0; color:#94a3b8;">Model</td>
                        <td style="padding:4px 0;">Claude Sonnet 4.6</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 16px 4px 0; color:#94a3b8;">Region</td>
                        <td style="padding:4px 0;">Montreal, Canada</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="height:32px;"></div>

              <!-- WhatsApp Setup Steps -->
              <h2 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#ffffff;">
                Connect WhatsApp in 3 Steps
              </h2>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Step 1 -->
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px; vertical-align:top;">
                          <div style="width:28px; height:28px; background-color:#3b82f6; border-radius:50%; text-align:center; line-height:28px; font-size:14px; font-weight:600; color:#ffffff;">1</div>
                        </td>
                        <td style="vertical-align:top; padding-left:12px;">
                          <p style="margin:0; font-size:15px; color:#e2e8f0; line-height:1.5;">
                            <strong>Open your dashboard</strong> at the link above and log in with your access token.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 2 -->
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px; vertical-align:top;">
                          <div style="width:28px; height:28px; background-color:#3b82f6; border-radius:50%; text-align:center; line-height:28px; font-size:14px; font-weight:600; color:#ffffff;">2</div>
                        </td>
                        <td style="vertical-align:top; padding-left:12px;">
                          <p style="margin:0; font-size:15px; color:#e2e8f0; line-height:1.5;">
                            <strong>Go to Channels &rarr; WhatsApp</strong> and scan the QR code with your phone (WhatsApp &rarr; Linked Devices &rarr; Link a Device).
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 3 -->
                <tr>
                  <td style="padding:0 0 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px; vertical-align:top;">
                          <div style="width:28px; height:28px; background-color:#3b82f6; border-radius:50%; text-align:center; line-height:28px; font-size:14px; font-weight:600; color:#ffffff;">3</div>
                        </td>
                        <td style="vertical-align:top; padding-left:12px;">
                          <p style="margin:0; font-size:15px; color:#e2e8f0; line-height:1.5;">
                            <strong>Send a message!</strong> Text your own number or have a friend message you. Moe will respond automatically.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="height:32px;"></div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block; background-color:#3b82f6; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
                      Open Your Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:13px; color:#64748b;">
                Need help? Reply to this email or reach out at
                <a href="mailto:support@moes.ai" style="color:#3b82f6; text-decoration:none;">support@moes.ai</a>
              </p>
              <p style="margin:0; font-size:12px; color:#475569;">
                &copy; ${new Date().getFullYear()} Moe's AI Inc. &mdash; Montreal, Canada
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
