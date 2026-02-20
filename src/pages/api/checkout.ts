import type { APIRoute } from "astro";
import { createCheckoutSession } from "../../lib/stripe";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { plan, email, interval } = body;

    if (!plan || !email) {
      return new Response(JSON.stringify({ error: "plan and email are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (plan !== "starter" && plan !== "pro") {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'starter' or 'pro'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const billingInterval = interval === "year" ? "year" : "month";
    const url = await createCheckoutSession(plan, email, billingInterval);

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
