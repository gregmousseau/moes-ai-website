const LITELLM_URL = process.env.LITELLM_URL || "http://35.203.52.219:4000";
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || "sk-042478233d99091be70a78926daafbd1bbd159bae2ae6bc04be213ec9e217ccc";

interface LiteLLMKey {
  key: string;
  key_name: string;
  token: string;
  expires: string | null;
  max_budget: number | null;
}

const PLAN_BUDGETS: Record<string, number> = {
  starter: 15,  // $15/month spend limit
  pro: 50,      // $50/month spend limit
  enterprise: 500,
};

export async function createVirtualKey(
  userId: string,
  plan: string,
  customerEmail: string
): Promise<LiteLLMKey> {
  const maxBudget = PLAN_BUDGETS[plan] ?? PLAN_BUDGETS.starter;

  const res = await fetch(`${LITELLM_URL}/key/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key_name: `moes-${userId}`,
      max_budget: maxBudget,
      budget_duration: "1mo",
      metadata: {
        customer_email: customerEmail,
        plan,
        managed_by: "moes-ai",
      },
      models: plan === "starter"
        ? ["anthropic/claude-haiku-4-5"]
        : ["anthropic/claude-sonnet-4-6", "anthropic/claude-haiku-4-5", "openai/gpt-4o"],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiteLLM key creation failed: ${err}`);
  }

  return res.json();
}

export async function revokeVirtualKey(keyId: string): Promise<void> {
  const res = await fetch(`${LITELLM_URL}/key/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: [keyId] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiteLLM key revocation failed: ${err}`);
  }
}

export async function getKeyUsage(
  keyId: string
): Promise<{ spend: number; max_budget: number | null }> {
  const res = await fetch(`${LITELLM_URL}/key/info`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiteLLM key info failed: ${err}`);
  }

  const data = await res.json();
  // Find the specific key
  const keyInfo = data.keys?.find((k: any) => k.token === keyId);
  return {
    spend: keyInfo?.spend ?? 0,
    max_budget: keyInfo?.max_budget ?? null,
  };
}
