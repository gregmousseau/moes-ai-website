const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function headers() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function url(table: string, query = "") {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

export interface Instance {
  id: string;
  customer_email: string;
  customer_name: string | null;
  instance_name: string;
  gcp_instance_id: string | null;
  external_ip: string | null;
  gateway_token_hash: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  model: string;
  region: string;
  litellm_key_id: string | null;
  litellm_virtual_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  instance_id: string;
  provider: string;
  key_hash: string;
  created_at: string;
}

export async function createInstance(
  data: Omit<Instance, "id" | "created_at" | "updated_at">
): Promise<Instance> {
  const res = await fetch(url("instances"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create instance: ${err}`);
  }
  const rows = await res.json();
  return rows[0];
}

export async function getInstance(id: string): Promise<Instance | null> {
  const res = await fetch(url("instances", `id=eq.${id}&select=*`), {
    headers: headers(),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function getInstanceBySubscription(
  subscriptionId: string
): Promise<Instance | null> {
  const res = await fetch(
    url("instances", `stripe_subscription_id=eq.${subscriptionId}&select=*`),
    { headers: headers() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function getInstanceByEmail(
  email: string
): Promise<Instance[]> {
  const res = await fetch(
    url("instances", `customer_email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc`),
    { headers: headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function listInstances(): Promise<Instance[]> {
  const res = await fetch(
    url("instances", "select=*&order=created_at.desc"),
    { headers: headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function updateInstance(
  id: string,
  data: Partial<Instance>
): Promise<Instance | null> {
  const res = await fetch(url("instances", `id=eq.${id}`), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function deleteInstance(id: string): Promise<boolean> {
  const res = await fetch(url("instances", `id=eq.${id}`), {
    method: "DELETE",
    headers: headers(),
  });
  return res.ok;
}

export async function storeApiKey(
  data: Omit<ApiKey, "id" | "created_at">
): Promise<ApiKey> {
  const res = await fetch(url("api_keys"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to store API key: ${err}`);
  }
  const rows = await res.json();
  return rows[0];
}
