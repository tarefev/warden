import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accessStates } from "@warden/shared";

export const accessEnum = pgEnum("access", accessStates);

/**
 * Пользователи. Строку создаёт либо первый вход через GitHub (access = none), либо админ, добавивший
 * логин заранее (access = active, github_id ещё пуст — привяжется при первом входе).
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    githubId: bigint("github_id", { mode: "number" }).unique(),
    login: text("login").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    access: accessEnum("access").notNull().default("none"),
    isAdmin: boolean("is_admin").notNull().default(false),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("users_login_lower_idx").on(sql`lower(${t.login})`)],
);

/** Сессии входа. id — sha256 от токена из куки, сам токен в базе не хранится. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
