import { z } from "zod";

/** none — вошёл, доступа нет; requested — попросил доступ; active — допущен. */
export const accessStates = ["none", "requested", "active"] as const;
export type AccessState = (typeof accessStates)[number];

export const meSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isAdmin: z.boolean(),
  access: z.enum(accessStates),
});
export type Me = z.infer<typeof meSchema>;

export const memberSchema = meSchema.extend({
  githubLinked: z.boolean(),
  requestedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const membersSchema = z.array(memberSchema);

/** Логин GitHub: латиница, цифры и дефис, до 39 символов. */
export const addMemberSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1)
    .max(39)
    .regex(/^[A-Za-z0-9-]+$/),
});
export type AddMember = z.infer<typeof addMemberSchema>;

export const okSchema = z.object({ ok: z.literal(true) });

/* ───────────── Трекер ───────────── */

export const ISSUE_PREFIX = "WRD";

export const issueStatuses = ["new", "in_progress", "review", "testing", "done"] as const;
export type IssueStatus = (typeof issueStatuses)[number];

export const issueAreas = [
  "frontend",
  "backend",
  "design",
  "analytics",
  "qa",
  "marketing",
  "research",
  "pm",
  "po",
] as const;
export type IssueArea = (typeof issueAreas)[number];

/** 1 — самый срочный, 8 — самый низкий. */
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 8;
export const PRIORITY_DEFAULT = 4;

const prioritySchema = z.number().int().min(PRIORITY_MIN).max(PRIORITY_MAX);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const memberRefSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  access: z.enum(accessStates),
});
export type MemberRef = z.infer<typeof memberRefSchema>;

export const sprintSchema = z.object({
  id: z.number(),
  name: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  isCurrent: z.boolean(),
});
export type Sprint = z.infer<typeof sprintSchema>;

export const metaSchema = z.object({
  members: z.array(memberRefSchema),
  sprints: z.array(sprintSchema),
});
export type Meta = z.infer<typeof metaSchema>;

export const issueListItemSchema = z.object({
  id: z.number(),
  key: z.string(),
  title: z.string(),
  status: z.enum(issueStatuses),
  priority: z.number(),
  area: z.enum(issueAreas).nullable(),
  assigneeId: z.number().nullable(),
  sprintId: z.number().nullable(),
  parentId: z.number().nullable(),
  parentKey: z.string().nullable(),
  childrenCount: z.number(),
  childrenDone: z.number(),
  updatedAt: z.string(),
});
export type IssueListItem = z.infer<typeof issueListItemSchema>;

export const issueListSchema = z.object({
  items: z.array(issueListItemSchema),
  total: z.number(),
});
export type IssueList = z.infer<typeof issueListSchema>;

export const commentSchema = z.object({
  id: z.number(),
  authorId: z.number().nullable(),
  body: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof commentSchema>;

export const issueLinkSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string().nullable(),
  authorId: z.number().nullable(),
  createdAt: z.string(),
});
export type IssueLink = z.infer<typeof issueLinkSchema>;

/** Поля, изменения которых пишутся в историю, плюс служебные события. */
export const historyFields = [
  "created",
  "title",
  "description",
  "status",
  "priority",
  "area",
  "assignee",
  "sprint",
  "parent",
  "link_added",
  "link_removed",
] as const;
export type HistoryField = (typeof historyFields)[number];

export const historyEntrySchema = z.object({
  id: z.number(),
  actorId: z.number().nullable(),
  field: z.enum(historyFields),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  createdAt: z.string(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const issueDetailsSchema = issueListItemSchema.extend({
  description: z.string(),
  authorId: z.number().nullable(),
  createdAt: z.string(),
  doneAt: z.string().nullable(),
  children: z.array(issueListItemSchema),
  comments: z.array(commentSchema),
  links: z.array(issueLinkSchema),
  history: z.array(historyEntrySchema),
});
export type IssueDetails = z.infer<typeof issueDetailsSchema>;

export const issueCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(100_000).default(""),
  status: z.enum(issueStatuses).default("new"),
  priority: prioritySchema.default(PRIORITY_DEFAULT),
  area: z.enum(issueAreas).nullable().default(null),
  assigneeId: z.number().int().nullable().default(null),
  sprintId: z.number().int().nullable().default(null),
  parentId: z.number().int().nullable().default(null),
});
export type IssueCreate = z.input<typeof issueCreateSchema>;

export const issuePatchSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(100_000).optional(),
  status: z.enum(issueStatuses).optional(),
  priority: prioritySchema.optional(),
  area: z.enum(issueAreas).nullable().optional(),
  assigneeId: z.number().int().nullable().optional(),
  sprintId: z.number().int().nullable().optional(),
  parentId: z.number().int().nullable().optional(),
});
export type IssuePatch = z.infer<typeof issuePatchSchema>;

/** Фильтры списка. assignee: me | none | id; sprint: current | none | id; status: open | статус. */
export const issueListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  assignee: z
    .string()
    .regex(/^(me|none|\d+)$/)
    .optional(),
  sprint: z
    .string()
    .regex(/^(current|none|\d+)$/)
    .optional(),
  status: z.enum(["open", ...issueStatuses]).optional(),
  area: z.enum(issueAreas).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});
export type IssueListQuery = z.infer<typeof issueListQuerySchema>;

export const commentCreateSchema = z.object({ body: z.string().trim().min(1).max(20_000) });
export type CommentCreate = z.infer<typeof commentCreateSchema>;

export const linkCreateSchema = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2000),
  title: z.string().trim().max(200).optional(),
});
export type LinkCreate = z.infer<typeof linkCreateSchema>;

export const sprintCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startsAt: dateSchema.nullable().default(null),
  endsAt: dateSchema.nullable().default(null),
});
export type SprintCreate = z.input<typeof sprintCreateSchema>;

export const sprintPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  startsAt: dateSchema.nullable().optional(),
  endsAt: dateSchema.nullable().optional(),
  isCurrent: z.boolean().optional(),
});
export type SprintPatch = z.infer<typeof sprintPatchSchema>;

export function toIssueKey({ id }: { id: number }): string {
  return `${ISSUE_PREFIX}-${id}`;
}

/** WRD-12, wrd-12 или 12 → 12. */
export function parseIssueKey({ key }: { key: string }): number | undefined {
  const match = /^(?:wrd-)?(\d+)$/i.exec(key.trim());
  if (!match) return undefined;
  const raw = match[1];
  if (!raw) return undefined;
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id)) return undefined;

  return id;
}
