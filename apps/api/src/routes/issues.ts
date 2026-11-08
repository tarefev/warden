import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { comments, db, issueLinks, issues } from "@warden/db";
import {
  commentCreateSchema,
  issueCreateSchema,
  issueListQuerySchema,
  issuePatchSchema,
  linkCreateSchema,
  parseIssueKey,
  toIssueKey,
} from "@warden/shared";
import type { IssuePatch } from "@warden/shared";
import { requireActive, requireSession } from "@warden/api/lib/auth";
import type { AuthEnv } from "@warden/api/lib/auth";
import {
  checkAssignee,
  checkParent,
  checkSprint,
  closeParentIfChildrenDone,
  describeSprint,
  describeUser,
  findIssueRow,
  listIssues,
  loadIssueDetails,
  pickDoneAt,
  writeHistory,
} from "@warden/api/lib/issues";
import type { HistoryChange, IssueRow, RefCheck } from "@warden/api/lib/issues";

async function checkRefs({
  issueId,
  assigneeId,
  sprintId,
  parentId,
}: {
  issueId: number | null;
  assigneeId?: number | null;
  sprintId?: number | null;
  parentId?: number | null;
}): Promise<RefCheck> {
  if (typeof assigneeId === "number") {
    const result = await checkAssignee({ assigneeId });
    if (!result.ok) return result;
  }
  if (typeof sprintId === "number") {
    const result = await checkSprint({ sprintId });
    if (!result.ok) return result;
  }
  if (typeof parentId === "number") {
    const result = await checkParent({ issueId, parentId });
    if (!result.ok) return result;
  }

  return { ok: true };
}

function pickParentKey({ id }: { id: number | null }): string | null {
  if (id === null) return null;

  return toIssueKey({ id });
}

type Patch = Partial<typeof issues.$inferInsert>;

/** Сравнивает присланные поля с текущими: что поменять в задаче и что записать в историю. */
async function diffPatch({
  before,
  body,
}: {
  before: IssueRow;
  body: IssuePatch;
}): Promise<{ patch: Patch; changes: HistoryChange[] }> {
  const patch: Patch = {};
  const changes: HistoryChange[] = [];
  if (body.title !== undefined && body.title !== before.title) {
    patch.title = body.title;
    changes.push({ field: "title", oldValue: before.title, newValue: body.title });
  }
  if (body.description !== undefined && body.description !== before.description) {
    patch.description = body.description;
    changes.push({
      field: "description",
      oldValue: before.description,
      newValue: body.description,
    });
  }
  if (body.status !== undefined && body.status !== before.status) {
    patch.status = body.status;
    patch.doneAt = pickDoneAt({ status: body.status });
    changes.push({ field: "status", oldValue: before.status, newValue: body.status });
  }
  if (body.priority !== undefined && body.priority !== before.priority) {
    patch.priority = body.priority;
    changes.push({
      field: "priority",
      oldValue: `${before.priority}`,
      newValue: `${body.priority}`,
    });
  }
  if (body.area !== undefined && body.area !== before.area) {
    patch.area = body.area;
    changes.push({ field: "area", oldValue: before.area, newValue: body.area });
  }
  if (body.assigneeId !== undefined && body.assigneeId !== before.assigneeId) {
    patch.assigneeId = body.assigneeId;
    changes.push({
      field: "assignee",
      oldValue: await describeUser({ id: before.assigneeId, tx: db }),
      newValue: await describeUser({ id: body.assigneeId, tx: db }),
    });
  }
  if (body.sprintId !== undefined && body.sprintId !== before.sprintId) {
    patch.sprintId = body.sprintId;
    changes.push({
      field: "sprint",
      oldValue: await describeSprint({ id: before.sprintId, tx: db }),
      newValue: await describeSprint({ id: body.sprintId, tx: db }),
    });
  }
  if (body.parentId !== undefined && body.parentId !== before.parentId) {
    patch.parentId = body.parentId;
    changes.push({
      field: "parent",
      oldValue: pickParentKey({ id: before.parentId }),
      newValue: pickParentKey({ id: body.parentId }),
    });
  }

  return { patch, changes };
}

function pickLinkTitle({ title }: { title: string | undefined }): string | null {
  if (!title) return null;

  return title;
}

function readIssueId({ key }: { key: string }): number | undefined {
  return parseIssueKey({ key });
}

export const issuesRoute = new Hono<AuthEnv>()
  .use(requireSession)
  .use(requireActive)
  .get("/", zValidator("query", issueListQuerySchema), async (c) => {
    const query = c.req.valid("query");

    return c.json(await listIssues({ query, meId: c.get("user").id }));
  })
  .post("/", zValidator("json", issueCreateSchema), async (c) => {
    const body = c.req.valid("json");
    const refs = await checkRefs({ issueId: null, ...body });
    if (!refs.ok) return c.json({ error: refs.error }, 422);
    const actorId = c.get("user").id;
    const id = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(issues)
        .values({ ...body, authorId: actorId, doneAt: pickDoneAt({ status: body.status }) })
        .returning({ id: issues.id });
      const row = inserted[0];
      if (!row) throw new Error("issue insert failed");
      await writeHistory({
        tx,
        issueId: row.id,
        actorId,
        changes: [{ field: "created", oldValue: null, newValue: body.title }],
      });
      await closeParentIfChildrenDone({ parentId: body.parentId, tx });

      return row.id;
    });

    return c.json(await loadIssueDetails({ id }), 201);
  })
  .get("/:key", async (c) => {
    const id = readIssueId({ key: c.req.param("key") });
    if (id === undefined) return c.json({ error: "bad key" }, 400);
    const details = await loadIssueDetails({ id });
    if (!details) return c.json({ error: "not found" }, 404);

    return c.json(details);
  })
  .patch("/:key", zValidator("json", issuePatchSchema), async (c) => {
    const id = readIssueId({ key: c.req.param("key") });
    if (id === undefined) return c.json({ error: "bad key" }, 400);
    const body = c.req.valid("json");
    const before = await findIssueRow({ id });
    if (!before) return c.json({ error: "not found" }, 404);
    const refs = await checkRefs({ issueId: id, ...body });
    if (!refs.ok) return c.json({ error: refs.error }, 422);
    const { patch, changes } = await diffPatch({ before, body });
    if (changes.length === 0) return c.json(await loadIssueDetails({ id }));
    const actorId = c.get("user").id;
    await db.transaction(async (tx) => {
      await tx
        .update(issues)
        .set({ ...patch, updatedAt: new Date().toISOString() })
        .where(eq(issues.id, id));
      await writeHistory({ tx, issueId: id, actorId, changes });
      if (patch.status !== undefined)
        await closeParentIfChildrenDone({ parentId: before.parentId, tx });
      if (patch.parentId !== undefined)
        await closeParentIfChildrenDone({ parentId: patch.parentId, tx });
    });

    return c.json(await loadIssueDetails({ id }));
  })
  .post("/:key/comments", zValidator("json", commentCreateSchema), async (c) => {
    const id = readIssueId({ key: c.req.param("key") });
    if (id === undefined) return c.json({ error: "bad key" }, 400);
    const issue = await findIssueRow({ id });
    if (!issue) return c.json({ error: "not found" }, 404);
    const { body } = c.req.valid("json");
    await db.transaction(async (tx) => {
      await tx.insert(comments).values({ issueId: id, authorId: c.get("user").id, body });
      await tx.update(issues).set({ updatedAt: new Date().toISOString() }).where(eq(issues.id, id));
    });

    return c.json(await loadIssueDetails({ id }), 201);
  })
  .post("/:key/links", zValidator("json", linkCreateSchema), async (c) => {
    const id = readIssueId({ key: c.req.param("key") });
    if (id === undefined) return c.json({ error: "bad key" }, 400);
    const issue = await findIssueRow({ id });
    if (!issue) return c.json({ error: "not found" }, 404);
    const body = c.req.valid("json");
    const actorId = c.get("user").id;
    await db.transaction(async (tx) => {
      await tx.insert(issueLinks).values({
        issueId: id,
        url: body.url,
        title: pickLinkTitle({ title: body.title }),
        authorId: actorId,
      });
      await tx.update(issues).set({ updatedAt: new Date().toISOString() }).where(eq(issues.id, id));
      await writeHistory({
        tx,
        issueId: id,
        actorId,
        changes: [{ field: "link_added", oldValue: null, newValue: body.url }],
      });
    });

    return c.json(await loadIssueDetails({ id }), 201);
  })
  .delete("/:key/links/:linkId", async (c) => {
    const id = readIssueId({ key: c.req.param("key") });
    if (id === undefined) return c.json({ error: "bad key" }, 400);
    const linkId = Number.parseInt(c.req.param("linkId"), 10);
    if (Number.isNaN(linkId)) return c.json({ error: "bad link id" }, 400);
    const actorId = c.get("user").id;
    const removed = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(issueLinks)
        .where(and(eq(issueLinks.id, linkId), eq(issueLinks.issueId, id)))
        .returning({ url: issueLinks.url });
      const row = deleted[0];
      if (!row) return false;
      await tx.update(issues).set({ updatedAt: new Date().toISOString() }).where(eq(issues.id, id));
      await writeHistory({
        tx,
        issueId: id,
        actorId,
        changes: [{ field: "link_removed", oldValue: row.url, newValue: null }],
      });

      return true;
    });
    if (!removed) return c.json({ error: "not found" }, 404);

    return c.json(await loadIssueDetails({ id }));
  });
