import type { APIRoute } from "astro";
import { getInstance, updateInstance } from "../../../../../lib/registry";

function authorize(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export const POST: APIRoute = async ({ params, request }) => {
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

  // TODO: Stop the GCP VM via compute API when ready
  const updated = await updateInstance(id, { status: "suspended" });

  return new Response(JSON.stringify({ instance: updated }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
