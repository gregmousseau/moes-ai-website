import type { APIRoute } from "astro";
import { getInstance, deleteInstance } from "../../../../../lib/registry";
import { revokeVirtualKey } from "../../../../../lib/litellm";

function authorize(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!authorize(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Instance ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const instance = await getInstance(id);
  if (!instance) {
    return new Response(JSON.stringify({ error: "Instance not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Revoke LiteLLM key if exists
  if (instance.litellm_key_id) {
    try {
      await revokeVirtualKey(instance.litellm_key_id);
    } catch (err) {
      console.error("Failed to revoke LiteLLM key:", err);
    }
  }

  // TODO: Delete the GCP VM via compute API when ready
  await deleteInstance(id);

  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
