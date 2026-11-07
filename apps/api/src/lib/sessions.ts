import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, sessions, users } from "@warden/db";

export const SESSION_COOKIE = "warden_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type UserRow = typeof users.$inferSelect;

function hashToken({ token }: { token: string }): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession({ userId }: { userId: number }): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db.insert(sessions).values({ id: hashToken({ token }), userId, expiresAt });

  return token;
}

export async function findSessionUser({
  token,
}: {
  token: string;
}): Promise<{ user: UserRow; sessionId: string } | undefined> {
  const sessionId = hashToken({ token });
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);
  const first = rows[0];
  if (!first) return undefined;

  return { user: first.user, sessionId };
}

export async function deleteSession({ sessionId }: { sessionId: string }): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
