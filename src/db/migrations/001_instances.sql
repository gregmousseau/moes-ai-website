-- Moe's AI Instance Registry
-- Migration 001: Core tables for instance and API key management

CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  instance_name TEXT NOT NULL UNIQUE,
  gcp_instance_id TEXT,
  external_ip TEXT,
  gateway_token_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'provisioning',
  model TEXT DEFAULT 'anthropic/claude-sonnet-4-6',
  region TEXT DEFAULT 'northamerica-northeast1-a',
  litellm_key_id TEXT,
  litellm_virtual_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_instances_email ON instances(customer_email);
CREATE INDEX IF NOT EXISTS idx_instances_stripe_sub ON instances(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_instance ON api_keys(instance_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER instances_updated_at
  BEFORE UPDATE ON instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
