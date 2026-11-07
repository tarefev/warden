import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Me, Member } from "@warden/shared";
import { SESSION_COOKIE, findSessionUser } from "@warden/api/lib/sessions";
import type { UserRow } from "@warden/api/lib/sessions";

export type AuthEnv = { Variables: { user: UserRow; sessionId: string } };

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "unauthorized" }, 401);
  const found = await findSessionUser({ token });
  if (!found) return c.json({ error: "unauthorized" }, 401);
  c.set("user", found.user);
  c.set("sessionId", found.sessionId);
  await next();
});

/** Пускает только допущенных. Ставить после requireSession. */
export const requireActive = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get("user").access !== "active") return c.json({ error: "forbidden" }, 403);
  await next();
});

/** Пускает только допущенного админа. Ставить после requireSession. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  if (user.access !== "active") return c.json({ error: "forbidden" }, 403);
  if (!user.isAdmin) return c.json({ error: "forbidden" }, 403);
  await next();
});

export function toMe({ user }: { user: UserRow }): Me {
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    access: user.access,
  };
}

function pickGithubLinked({ user }: { user: UserRow }): boolean {
  if (user.githubId === null) return false;

  return true;
}

export function toMember({ user }: { user: UserRow }): Member {
  return {
    ...toMe({ user }),
    githubLinked: pickGithubLinked({ user }),
    requestedAt: user.requestedAt,
    createdAt: user.createdAt,
  };
}
