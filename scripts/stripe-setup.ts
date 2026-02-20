/**
 * Stripe Product & Price Setup Script
 *
 * Run with: npx tsx scripts/stripe-setup.ts
 *
 * Creates the Starter and Pro products + prices in Stripe.
 * Uses STRIPE_SECRET_KEY from environment.
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: "Moe's AI — Starter",
    description: "1 AI assistant, WhatsApp channel, 10GB storage, community support",
    metadata: { plan: "starter" },
    prices: [
      { unit_amount: 2900, currency: "usd", interval: "month" as const },
      { unit_amount: 29000, currency: "usd", interval: "year" as const },
    ],
  },
  {
    name: "Moe's AI — Pro",
    description: "1 AI assistant, all channels, 50GB storage, priority support, custom personality & skills",
    metadata: { plan: "pro" },
    prices: [
      { unit_amount: 7900, currency: "usd", interval: "month" as const },
      { unit_amount: 79000, currency: "usd", interval: "year" as const },
    ],
  },
];

async function main() {
  console.log("Setting up Stripe products and prices...\n");

  for (const product of PRODUCTS) {
    console.log(`Creating product: ${product.name}`);
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });
    console.log(`  Product ID: ${stripeProduct.id}`);

    for (const price of product.prices) {
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: { interval: price.interval },
      });
      console.log(`  Price (${price.interval}): ${stripePrice.id} — $${price.unit_amount / 100}/${price.interval}`);
    }
    console.log();
  }

  console.log("Done! Products and prices created successfully.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
