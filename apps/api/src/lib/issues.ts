import { and, asc, count, desc, eq, ilike, isNull, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { comments, db, issueHistory, issueLinks, issues, sprints, users } from "@warden/db";
import { parseIssueKey, toIssueKey } from "@warden/shared";
import type {
  HistoryField,
  IssueDetails,
  IssueListItem,
  IssueListQuery,
  IssueStatus,
} from "@warden/shared";

export type IssueRow = typeof issues.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | Tx;

export type HistoryChange = {
  field: HistoryField;
  oldValue: string | null;
  newValue: string | null;
};

// Имя таблицы пишем явно: в запросе к одной таблице Drizzle опускает его, и внутри подзапроса
// "id" указал бы на саму подзадачу c, а не на внешнюю задачу.
const childrenCount = sql<number>`(select count(*)::int from issues c where c.parent_id = "issues"."id")`;
const childrenDone = sql<number>`(select count(*)::int from issues c where c.parent_id = "issues"."id" and c.status = 'done')`;

function pickParentKey({ parentId }: { parentId: number | null }): string | null {
  if (parentId === null) return null;

  return toIssueKey({ id: parentId });
}

function toListItem({
  row,
  total,
  done,
}: {
  row: IssueRow;
  total: number;
  done: number;
}): IssueListItem {
  return {
    id: row.id,
    key: toIssueKey({ id: row.id }),
    title: row.title,
    status: row.status,
    priority: row.priority,
    area: row.area,
    assigneeId: row.assigneeId,
    sprintId: row.sprintId,
    parentId: row.parentId,
    parentKey: pickParentKey({ parentId: row.parentId }),
    childrenCount: total,
    childrenDone: done,
    updatedAt: row.updatedAt,
  };
}

function pickAssigneeCondition({ assignee, meId }: { assignee: string; meId: number }): SQL {
  if (assignee === "me") return eq(issues.assigneeId, meId);
  if (assignee === "none") return isNull(issues.assigneeId);

  return eq(issues.assigneeId, Number.parseInt(assignee, 10));
}

function pickSprintCondition({ sprint }: { sprint: string }): SQL {
  if (sprint === "current")
    return sql`${issues.sprintId} = (select id from sprints where is_current)`;
  if (sprint === "none") return isNull(issues.sprintId);

  return eq(issues.sprintId, Number.parseInt(sprint, 10));
}

function pickSearchCondition({ q }: { q: string }): SQL {
  const id = parseIssueKey({ key: q });
  const byTitle = ilike(issues.title, `%${q}%`);
  if (id === undefined) return byTitle;

  return sql`(${eq(issues.id, id)} or ${byTitle})`;
}

function pickConditions({ query, meId }: { query: IssueListQuery; meId: number }): SQL[] {
  const conditions: SQL[] = [];
  if (query.assignee) conditions.push(pickAssigneeCondition({ assignee: query.assignee, meId }));
  if (query.sprint) conditions.push(pickSprintCondition({ sprint: query.sprint }));
  if (query.status === "open") conditions.push(ne(issues.status, "done"));
  if (query.status && query.status !== "open") conditions.push(eq(issues.status, query.status));
  if (query.area) conditions.push(eq(issues.area, query.area));
  if (query.q) conditions.push(pickSearchCondition({ q: query.q }));

  return conditions;
}

export async function listIssues({
  query,
  meId,
}: {
  query: IssueListQuery;
  meId: number;
}): Promise<{ items: IssueListItem[]; total: number }> {
  const where = and(...pickConditions({ query, meId }));
  const rows = await db
    .select({ row: issues, total: childrenCount, done: childrenDone })
    .from(issues)
    .where(where)
    .orderBy(asc(issues.priority), desc(issues.updatedAt))
    .limit(query.limit);
  const totalRows = await db.select({ value: count() }).from(issues).where(where);
  const totalRow = totalRows[0];
  const items = rows.map((r) => toListItem({ row: r.row, total: r.total, done: r.done }));
  if (!totalRow) return { items, total: items.length };

  return { items, total: totalRow.value };
}

export async function findIssueRow({
  id,
  tx,
}: {
  id: number;
  tx?: DbLike;
}): Promise<IssueRow | undefined> {
  const conn = pickConn({ tx });
  const rows = await conn.select().from(issues).where(eq(issues.id, id)).limit(1);

  return rows[0];
}

function pickConn({ tx }: { tx: DbLike | undefined }): DbLike {
  if (tx) return tx;

  return db;
}

export async function loadIssueDetails({ id }: { id: number }): Promise<IssueDetails | undefined> {
  const rows = await db
    .select({ row: issues, total: childrenCount, done: childrenDone })
    .from(issues)
    .where(eq(issues.id, id))
    .limit(1);
  const first = rows[0];
  if (!first) return undefined;
  const [childRows, commentRows, linkRows, historyRows] = await Promise.all([
    db
      .select({ row: issues, total: childrenCount, done: childrenDone })
      .from(issues)
      .where(eq(issues.parentId, id))
      .orderBy(asc(issues.id)),
    db
      .select()
      .from(comments)
      .where(eq(comments.issueId, id))
      .orderBy(asc(comments.createdAt), asc(comments.id)),
    db.select().from(issueLinks).where(eq(issueLinks.issueId, id)).orderBy(asc(issueLinks.id)),
    db
      .select()
      .from(issueHistory)
      .where(eq(issueHistory.issueId, id))
      .orderBy(desc(issueHistory.createdAt), desc(issueHistory.id)),
  ]);
  const row = first.row;

  return {
    ...toListItem({ row, total: first.total, done: first.done }),
    description: row.description,
    authorId: row.authorId,
    createdAt: row.createdAt,
    doneAt: row.doneAt,
    children: childRows.map((r) => toListItem({ row: r.row, total: r.total, done: r.done })),
    comments: commentRows.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      body: c.body,
      createdAt: c.createdAt,
    })),
    links: linkRows.map((l) => ({
      id: l.id,
      url: l.url,
      title: l.title,
      authorId: l.authorId,
      createdAt: l.createdAt,
    })),
    history: historyRows.map((h) => ({
      id: h.id,
      actorId: h.actorId,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
      createdAt: h.createdAt,
    })),
  };
}

export async function writeHistory({
  tx,
  issueId,
  actorId,
  changes,
}: {
  tx: DbLike;
  issueId: number;
  actorId: number | null;
  changes: HistoryChange[];
}): Promise<void> {
  if (changes.length === 0) return;

  await tx.insert(issueHistory).values(changes.map((c) => ({ issueId, actorId, ...c })));
}

/** Логин пользователя для истории; пусто — нет такого. */
export async function describeUser({
  id,
  tx,
}: {
  id: number | null;
  tx: DbLike;
}): Promise<string | null> {
  if (id === null) return null;
  const rows = await tx.select({ login: users.login }).from(users).where(eq(users.id, id)).limit(1);
  const first = rows[0];
  if (!first) return null;

  return first.login;
}

/** Название спринта для истории; пусто — нет такого. */
export async function describeSprint({
  id,
  tx,
}: {
  id: number | null;
  tx: DbLike;
}): Promise<string | null> {
  if (id === null) return null;
  const rows = await tx
    .select({ name: sprints.name })
    .from(sprints)
    .where(eq(sprints.id, id))
    .limit(1);
  const first = rows[0];
  if (!first) return null;

  return first.name;
}

export function pickDoneAt({ status }: { status: IssueStatus }): string | null {
  if (status === "done") return new Date().toISOString();

  return null;
}

/** Когда готовы все подзадачи, родитель сам переходит в «Готово». Пишется в историю от системы. */
export async function closeParentIfChildrenDone({
  parentId,
  tx,
}: {
  parentId: number | null;
  tx: DbLike;
}): Promise<void> {
  if (parentId === null) return;
  const parent = await findIssueRow({ id: parentId, tx });
  if (!parent) return;
  if (parent.status === "done") return;
  const openRows = await tx
    .select({ value: count() })
    .from(issues)
    .where(and(eq(issues.parentId, parentId), ne(issues.status, "done")));
  const open = openRows[0];
  if (!open) return;
  if (open.value > 0) return;
  const now = new Date().toISOString();
  await tx
    .update(issues)
    .set({ status: "done", doneAt: now, updatedAt: now })
    .where(eq(issues.id, parentId));
  await writeHistory({
    tx,
    issueId: parentId,
    actorId: null,
    changes: [{ field: "status", oldValue: parent.status, newValue: "done" }],
  });
}

export type RefCheck = { ok: true } | { ok: false; error: string };

/** Подзадачи одного уровня: родитель сам не подзадача, у подзадачи нет своих подзадач. */
export async function checkParent({
  issueId,
  parentId,
}: {
  issueId: number | null;
  parentId: number;
}): Promise<RefCheck> {
  if (issueId === parentId)
    return { ok: false, error: "задача не может быть родителем самой себе" };
  const parent = await findIssueRow({ id: parentId });
  if (!parent) return { ok: false, error: `нет задачи ${toIssueKey({ id: parentId })}` };
  if (parent.parentId !== null)
    return { ok: false, error: `${toIssueKey({ id: parentId })} сама подзадача` };
  if (issueId === null) return { ok: true };
  const childRows = await db
    .select({ value: count() })
    .from(issues)
    .where(eq(issues.parentId, issueId));
  const children = childRows[0];
  if (!children) return { ok: true };
  if (children.value > 0) return { ok: false, error: "у задачи есть свои подзадачи" };

  return { ok: true };
}

export async function checkAssignee({ assigneeId }: { assigneeId: number }): Promise<RefCheck> {
  const rows = await db
    .select({ access: users.access })
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);
  const first = rows[0];
  if (!first) return { ok: false, error: "нет такого пользователя" };
  if (first.access !== "active") return { ok: false, error: "у пользователя нет доступа" };

  return { ok: true };
}

export async function checkSprint({ sprintId }: { sprintId: number }): Promise<RefCheck> {
  const rows = await db
    .select({ id: sprints.id })
    .from(sprints)
    .where(eq(sprints.id, sprintId))
    .limit(1);
  if (!rows[0]) return { ok: false, error: "нет такого спринта" };

  return { ok: true };
}
