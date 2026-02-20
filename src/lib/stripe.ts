import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 2900, // cents
    annualPrice: 29000, // cents (10 months)
    features: [
      "1 AI assistant instance",
      "WhatsApp channel",
      "10GB storage",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 7900,
    annualPrice: 79000,
    features: [
      "1 AI assistant instance",
      "All channels (WhatsApp, Telegram, Discord, Slack)",
      "50GB storage",
      "Priority support",
      "Custom personality & skills",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Unlimited instances",
      "All channels",
      "Unlimited storage",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export async function createCheckoutSession(
  plan: "starter" | "pro",
  email: string,
  interval: "month" | "year" = "month"
): Promise<string> {
  const planConfig = PLANS[plan];
  const unitAmount =
    interval === "year" ? planConfig.annualPrice : planConfig.monthlyPrice;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Moe's AI — ${planConfig.name}`,
            description: planConfig.features.join(", "),
          },
          unit_amount: unitAmount,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    metadata: { plan },
    success_url: `${process.env.SITE_URL || "https://moes.ai"}/pricing?success=true`,
    cancel_url: `${process.env.SITE_URL || "https://moes.ai"}/pricing?canceled=true`,
  });

  return session.url!;
}

export function verifyWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId);
}

export { stripe };
