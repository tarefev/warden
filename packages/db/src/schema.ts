import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  PRIORITY_DEFAULT,
  PRIORITY_MAX,
  PRIORITY_MIN,
  accessStates,
  historyFields,
  issueAreas,
  issueStatuses,
} from "@warden/shared";

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

/* ───────────── Трекер ───────────── */

export const issueStatusEnum = pgEnum("issue_status", issueStatuses);
export const issueAreaEnum = pgEnum("issue_area", issueAreas);
export const historyFieldEnum = pgEnum("history_field", historyFields);

export const sprints = pgTable(
  "sprints",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    startsAt: date("starts_at", { mode: "string" }),
    endsAt: date("ends_at", { mode: "string" }),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("sprints_current_idx")
      .on(t.isCurrent)
      .where(sql`${t.isCurrent}`),
  ],
);

/** Задача. Номер для людей — WRD-<id>. Подзадачи одного уровня: у родителя parent_id пуст. */
export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: issueStatusEnum("status").notNull().default("new"),
    priority: smallint("priority").notNull().default(PRIORITY_DEFAULT),
    area: issueAreaEnum("area"),
    assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
    parentId: integer("parent_id").references((): AnyPgColumn => issues.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
    doneAt: timestamp("done_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    check(
      "issues_priority_check",
      sql`${t.priority} between ${sql.raw(String(PRIORITY_MIN))} and ${sql.raw(String(PRIORITY_MAX))}`,
    ),
    index("issues_assignee_idx").on(t.assigneeId),
    index("issues_sprint_idx").on(t.sprintId),
    index("issues_parent_idx").on(t.parentId),
    index("issues_status_idx").on(t.status),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("comments_issue_idx").on(t.issueId)],
);

export const issueLinks = pgTable(
  "issue_links",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("issue_links_issue_idx").on(t.issueId)],
);

/**
 * История изменений. old/new — значения для показа: ключ статуса или области, число приоритета,
 * логин исполнителя, название спринта, номер родителя, текст названия или описания, адрес ссылки.
 * actor_id пуст — изменение сделала система (родитель закрылся сам).
 */
export const issueHistory = pgTable(
  "issue_history",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    field: historyFieldEnum("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("issue_history_issue_idx").on(t.issueId)],
);
