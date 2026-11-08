import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, sprints } from "@warden/db";
import { sprintCreateSchema, sprintPatchSchema } from "@warden/shared";
import type { Sprint } from "@warden/shared";
import { requireActive, requireSession } from "@warden/api/lib/auth";
import type { AuthEnv } from "@warden/api/lib/auth";

type SprintRow = typeof sprints.$inferSelect;

export function toSprint({ row }: { row: SprintRow }): Sprint {
  return {
    id: row.id,
    name: row.name,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isCurrent: row.isCurrent,
  };
}

export async function listSprints(): Promise<Sprint[]> {
  const rows = await db.select().from(sprints).orderBy(desc(sprints.id));

  return rows.map((row) => toSprint({ row }));
}

export const sprintsRoute = new Hono<AuthEnv>()
  .use(requireSession)
  .use(requireActive)
  .get("/", async (c) => c.json(await listSprints()))
  .post("/", zValidator("json", sprintCreateSchema), async (c) => {
    const body = c.req.valid("json");
    const inserted = await db.insert(sprints).values(body).returning();
    const row = inserted[0];
    if (!row) return c.json({ error: "insert failed" }, 500);

    return c.json(toSprint({ row }), 201);
  })
  .patch("/:id", zValidator("json", sprintPatchSchema), async (c) => {
    const id = Number.parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) return c.json({ error: "bad id" }, 400);
    const { isCurrent, ...fields } = c.req.valid("json");
    const row = await db.transaction(async (tx) => {
      // Текущий спринт один: сначала снимаем отметку со всех.
      if (isCurrent === true)
        await tx.update(sprints).set({ isCurrent: false }).where(eq(sprints.isCurrent, true));
      const patch: Partial<typeof sprints.$inferInsert> = { ...fields };
      if (isCurrent !== undefined) patch.isCurrent = isCurrent;
      if (Object.keys(patch).length === 0) {
        const rows = await tx.select().from(sprints).where(eq(sprints.id, id)).limit(1);

        return rows[0];
      }
      const updated = await tx.update(sprints).set(patch).where(eq(sprints.id, id)).returning();

      return updated[0];
    });
    if (!row) return c.json({ error: "not found" }, 404);

    return c.json(toSprint({ row }));
  });
