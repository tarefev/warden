import { eq, sql } from "drizzle-orm";
import { db, users } from "@warden/db";
import type { GithubUser } from "@warden/api/lib/github";
import type { UserRow } from "@warden/api/lib/sessions";

function isSameLogin({ a, b }: { a: string; b: string }): boolean {
  if (a.toLowerCase() === b.toLowerCase()) return true;

  return false;
}

export async function findUserByLogin({ login }: { login: string }): Promise<UserRow | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.login}) = lower(${login})`)
    .limit(1);

  return rows[0];
}

async function findUserByGithubId({
  githubId,
}: {
  githubId: number;
}): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);

  return rows[0];
}

/** Старая строка заняла логин, который на GitHub теперь у другого человека: освобождаем логин. */
async function releaseStaleLogin({
  row,
  githubId,
}: {
  row: UserRow | undefined;
  githubId: number;
}): Promise<UserRow | undefined> {
  if (!row) return undefined;
  if (row.githubId === null) return row;
  if (row.githubId === githubId) return row;
  await db
    .update(users)
    .set({ login: `renamed-${row.id}` })
    .where(eq(users.id, row.id));

  return undefined;
}

/**
 * Находит или создаёт пользователя по данным GitHub. Сначала по github_id, затем по логину (строка,
 * заведённая админом заранее). Логин из WARDEN_ADMIN_LOGIN всегда становится допущенным админом.
 */
export async function upsertGithubUser({
  ghUser,
  adminLogin,
}: {
  ghUser: GithubUser;
  adminLogin: string;
}): Promise<UserRow> {
  const isAdmin = isSameLogin({ a: ghUser.login, b: adminLogin });
  const profile = {
    githubId: ghUser.id,
    login: ghUser.login,
    name: ghUser.name,
    avatarUrl: ghUser.avatar_url,
  };
  const byId = await findUserByGithubId({ githubId: ghUser.id });
  const byLogin = await releaseStaleLogin({
    row: await findUserByLogin({ login: ghUser.login }),
    githubId: ghUser.id,
  });
  const existing = [byId, byLogin].find((row) => row !== undefined);
  if (existing) {
    const patch: Partial<typeof users.$inferInsert> = { ...profile };
    // Человек сменил логин на GitHub на тот, что админ уже добавил заранее: сливаем строки, допуск сохраняем.
    if (byId && byLogin && byId.id !== byLogin.id) {
      if (byLogin.access === "active") patch.access = "active";
      await db.delete(users).where(eq(users.id, byLogin.id));
    }
    if (isAdmin) {
      patch.isAdmin = true;
      patch.access = "active";
    }
    const updated = await db.update(users).set(patch).where(eq(users.id, existing.id)).returning();
    const row = updated[0];
    if (!row) throw new Error("user update failed");

    return row;
  }
  const values: typeof users.$inferInsert = { ...profile };
  if (isAdmin) {
    values.isAdmin = true;
    values.access = "active";
  }
  const inserted = await db.insert(users).values(values).returning();
  const row = inserted[0];
  if (!row) throw new Error("user insert failed");

  return row;
}
