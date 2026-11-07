import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, sessions, users } from "@warden/db";
import { addMemberSchema } from "@warden/shared";
import { requireAdmin, requireSession, toMember } from "@warden/api/lib/auth";
import type { AuthEnv } from "@warden/api/lib/auth";
import { findUserByLogin } from "@warden/api/lib/users";

function parseId({ raw }: { raw: string }): number | undefined {
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id)) return undefined;

  return id;
}

export const adminRoute = new Hono<AuthEnv>()
  .use(requireSession)
  .use(requireAdmin)
  .get("/members", async (c) => {
    const rows = await db.select().from(users).orderBy(asc(users.login));

    return c.json(rows.map((user) => toMember({ user })));
  })
  .post("/members", zValidator("json", addMemberSchema), async (c) => {
    const { login } = c.req.valid("json");
    const existing = await findUserByLogin({ login });
    if (existing) {
      const updated = await db
        .update(users)
        .set({ access: "active" })
        .where(eq(users.id, existing.id))
        .returning();
      const row = updated[0];
      if (!row) return c.json({ error: "update failed" }, 500);

      return c.json(toMember({ user: row }));
    }
    const inserted = await db.insert(users).values({ login, access: "active" }).returning();
    const row = inserted[0];
    if (!row) return c.json({ error: "insert failed" }, 500);

    return c.json(toMember({ user: row }), 201);
  })
  .post("/members/:id/approve", async (c) => {
    const id = parseId({ raw: c.req.param("id") });
    if (id === undefined) return c.json({ error: "bad id" }, 400);
    const updated = await db
      .update(users)
      .set({ access: "active" })
      .where(eq(users.id, id))
      .returning();
    const row = updated[0];
    if (!row) return c.json({ error: "not found" }, 404);

    return c.json(toMember({ user: row }));
  })
  .post("/members/:id/revoke", async (c) => {
    const id = parseId({ raw: c.req.param("id") });
    if (id === undefined) return c.json({ error: "bad id" }, 400);
    if (id === c.get("user").id) return c.json({ error: "нельзя убрать себя" }, 422);
    const updated = await db
      .update(users)
      .set({ access: "none", requestedAt: null })
      .where(eq(users.id, id))
      .returning();
    const row = updated[0];
    if (!row) return c.json({ error: "not found" }, 404);
    await db.delete(sessions).where(eq(sessions.userId, id));

    return c.json(toMember({ user: row }));
  });
