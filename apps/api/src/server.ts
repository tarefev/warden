import "@warden/db/env";
import { serve } from "@hono/node-server";
import { app } from "@warden/api/app";

function pickPort(): number {
  const raw = process.env.API_PORT;
  if (!raw) return 3100;
  const port = Number.parseInt(raw, 10);
  if (Number.isNaN(port)) return 3100;

  return port;
}

const port = pickPort();
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`warden api on http://127.0.0.1:${info.port}`);
});
