import type { APIRoute } from "astro";
import { verifyWebhook } from "../../../lib/stripe";
import { createInstance, getInstanceBySubscription, updateInstance } from "../../../lib/registry";
import { generateGatewayToken, hashToken } from "../../../lib/security";
import { createVirtualKey, revokeVirtualKey } from "../../../lib/litellm";
import { provisionInstance } from "../../../lib/gcp";
import { sendOnboardingEmail } from "../../../lib/email";

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;
  try {
    const body = await request.text();
    event = verifyWebhook(body, signature);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const email = session.customer_email || session.customer_details?.email;
        const plan = session.metadata?.plan || "starter";
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!email) {
          console.error("No email in checkout session");
          break;
        }

        // Generate gateway token
        const gatewayToken = generateGatewayToken();
        const tokenHash = hashToken(gatewayToken);

        // Create LiteLLM virtual key
        const sanitized = email.split("@")[0].replace(/[^a-z0-9-]/gi, "").toLowerCase();
        const instanceName = `moes-${sanitized}-${Date.now()}`;

        let litellmKey;
        try {
          litellmKey = await createVirtualKey(instanceName, plan, email);
        } catch (err) {
          console.error("LiteLLM key creation failed, continuing without:", err);
        }

        // Provision GCP instance
        const apiKey = litellmKey?.key || process.env.ANTHROPIC_API_KEY!;
        let gcpResult;
        try {
          gcpResult = await provisionInstance(instanceName, apiKey);
        } catch (err) {
          console.error("GCP provisioning failed:", err);
        }

        // Register instance in Supabase
        await createInstance({
          customer_email: email,
          customer_name: null,
          instance_name: instanceName,
          gcp_instance_id: gcpResult?.instanceName || null,
          external_ip: gcpResult?.externalIp || null,
          gateway_token_hash: tokenHash,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: gcpResult ? "active" : "provisioning",
          model: plan === "starter" ? "anthropic/claude-haiku-4-5" : "anthropic/claude-sonnet-4-6",
          region: "northamerica-northeast1-a",
          litellm_key_id: litellmKey?.token || null,
          litellm_virtual_key: litellmKey?.key || null,
        });

        // Send onboarding email
        if (gcpResult) {
          try {
            await sendOnboardingEmail({
              recipientEmail: email,
              recipientName: email.split("@")[0],
              dashboardUrl: gcpResult.dashboardUrl,
              gatewayToken,
              instanceIp: gcpResult.externalIp,
              plan,
            });
          } catch (err) {
            console.error("Failed to send onboarding email:", err);
          }
        }

        console.log(`Provisioned instance ${instanceName} for ${email} (${plan})`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const instance = await getInstanceBySubscription(subscription.id);
        if (instance) {
          // Revoke LiteLLM key
          if (instance.litellm_key_id) {
            try {
              await revokeVirtualKey(instance.litellm_key_id);
            } catch (err) {
              console.error("Failed to revoke LiteLLM key:", err);
            }
          }
          await updateInstance(instance.id, { status: "terminated" });
          console.log(`Terminated instance ${instance.instance_name} (subscription canceled)`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const instance = await getInstanceBySubscription(subscriptionId);
          if (instance) {
            await updateInstance(instance.id, { status: "suspended" });
            console.log(`Suspended instance ${instance.instance_name} (payment failed)`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error handling ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
