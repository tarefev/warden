import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { db, users } from "@warden/db";
import { requireSession, toMe } from "@warden/api/lib/auth";
import type { AuthEnv } from "@warden/api/lib/auth";
import { readAuthConfig } from "@warden/api/lib/config";
import { buildAuthorizeUrl, exchangeCode, fetchGithubUser } from "@warden/api/lib/github";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSession,
  deleteSession,
} from "@warden/api/lib/sessions";
import { upsertGithubUser } from "@warden/api/lib/users";

const STATE_COOKIE = "warden_oauth_state";

export const authRoute = new Hono<AuthEnv>()
  .get("/github", (c) => {
    const config = readAuthConfig();
    const state = randomBytes(16).toString("base64url");
    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "Lax",
      secure: config.secureCookies,
      path: "/api/auth",
      maxAge: 600,
    });

    return c.redirect(buildAuthorizeUrl({ config, state }));
  })
  .get("/github/callback", async (c) => {
    const config = readAuthConfig();
    const code = c.req.query("code");
    const state = c.req.query("state");
    const expectedState = getCookie(c, STATE_COOKIE);
    deleteCookie(c, STATE_COOKIE, { path: "/api/auth" });
    if (!code) return c.redirect(`${config.appUrl}/?authError=cancelled`);
    if (!state) return c.redirect(`${config.appUrl}/?authError=state`);
    if (state !== expectedState) return c.redirect(`${config.appUrl}/?authError=state`);
    try {
      const token = await exchangeCode({ config, code });
      const ghUser = await fetchGithubUser({ token });
      const user = await upsertGithubUser({ ghUser, adminLogin: config.adminLogin });
      const sessionToken = await createSession({ userId: user.id });
      setCookie(c, SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: "Lax",
        secure: config.secureCookies,
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      });

      return c.redirect(`${config.appUrl}/`);
    } catch (error) {
      console.error("github login failed", error);

      return c.redirect(`${config.appUrl}/?authError=github`);
    }
  })
  .get("/me", requireSession, (c) => c.json(toMe({ user: c.get("user") })))
  .post("/logout", requireSession, async (c) => {
    await deleteSession({ sessionId: c.get("sessionId") });
    deleteCookie(c, SESSION_COOKIE, { path: "/" });

    return c.json({ ok: true });
  })
  .post("/request-access", requireSession, async (c) => {
    const user = c.get("user");
    if (user.access !== "none") return c.json(toMe({ user }));
    const updated = await db
      .update(users)
      .set({ access: "requested", requestedAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .returning();
    const row = updated[0];
    if (!row) return c.json({ error: "update failed" }, 500);

    return c.json(toMe({ user: row }));
  });
