import { Hono } from "hono";
import { logger } from "hono/logger";
import { adminRoute } from "@warden/api/routes/admin";
import { authRoute } from "@warden/api/routes/auth";

export const app = new Hono()
  .use(logger())
  .get("/api/health", (c) => c.json({ ok: true }))
  .route("/api/auth", authRoute)
  .route("/api/admin", adminRoute)
  .onError((error, c) => {
    console.error(error);

    return c.json({ error: error.message }, 500);
  });

export type AppType = typeof app;
