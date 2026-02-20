import type { APIRoute } from "astro";
import { listInstances } from "../../../lib/registry";

function authorize(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.ADMIN_SECRET}`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorize(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const instances = await listInstances();

  return new Response(JSON.stringify({ instances }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
