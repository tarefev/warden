import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { db, users } from "@warden/db";
import type { Meta } from "@warden/shared";
import { requireActive, requireSession } from "@warden/api/lib/auth";
import type { AuthEnv } from "@warden/api/lib/auth";
import { listSprints } from "@warden/api/routes/sprints";

export const metaRoute = new Hono<AuthEnv>()
  .use(requireSession)
  .use(requireActive)
  .get("/", async (c) => {
    const [userRows, sprintList] = await Promise.all([
      db.select().from(users).orderBy(asc(users.login)),
      listSprints(),
    ]);
    const body: Meta = {
      members: userRows.map((u) => ({
        id: u.id,
        login: u.login,
        name: u.name,
        avatarUrl: u.avatarUrl,
        access: u.access,
      })),
      sprints: sprintList,
    };

    return c.json(body);
  });
