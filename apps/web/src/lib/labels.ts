import { issueAreas, issueStatuses } from "@warden/shared";
import type { HistoryField, IssueArea, IssueStatus, Meta, MemberRef, Sprint } from "@warden/shared";

export const statusLabels: Record<IssueStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "Ревью",
  testing: "Тестирование",
  done: "Готово",
};

export const statusClasses: Record<IssueStatus, string> = {
  new: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  review: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  testing: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

export const areaLabels: Record<IssueArea, string> = {
  frontend: "Фронт",
  backend: "Бэк",
  design: "Дизайн",
  analytics: "Аналитика",
  qa: "QA",
  marketing: "Маркетинг",
  research: "Исследование",
  pm: "PM",
  po: "PO",
};

export const historyLabels: Record<HistoryField, string> = {
  created: "создал задачу",
  title: "название",
  description: "описание",
  status: "статус",
  priority: "приоритет",
  area: "область",
  assignee: "исполнитель",
  sprint: "спринт",
  parent: "родитель",
  link_added: "добавил ссылку",
  link_removed: "убрал ссылку",
};

export const priorities = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function isIssueStatus(value: string): value is IssueStatus {
  if (issueStatuses.some((s) => s === value)) return true;

  return false;
}

export function isIssueArea(value: string): value is IssueArea {
  if (issueAreas.some((a) => a === value)) return true;

  return false;
}

export function priorityClass({ priority }: { priority: number }): string {
  if (priority <= 2) return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
  if (priority <= 4) return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200";

  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

export function formatDate({ iso }: { iso: string | null }): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function formatDateTime({ iso }: { iso: string | null }): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function findMember({
  meta,
  id,
}: {
  meta: Meta | undefined;
  id: number | null;
}): MemberRef | undefined {
  if (!meta) return undefined;
  if (id === null) return undefined;

  return meta.members.find((m) => m.id === id);
}

export function findSprint({
  meta,
  id,
}: {
  meta: Meta | undefined;
  id: number | null;
}): Sprint | undefined {
  if (!meta) return undefined;
  if (id === null) return undefined;

  return meta.sprints.find((s) => s.id === id);
}

/** Значение select для nullable-числа: пустая строка — «не выбрано». */
export function toSelectValue({ id }: { id: number | null }): string {
  if (id === null) return "";

  return `${id}`;
}

/** Обратно из select: пустая строка — null, иначе число. */
export function fromSelectValue({ value }: { value: string }): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return null;

  return n;
}

export function formatSprintDates({ sprint }: { sprint: Sprint }): string {
  const start = formatDate({ iso: sprint.startsAt });
  const end = formatDate({ iso: sprint.endsAt });
  if (!start && !end) return "";

  return `${start} — ${end}`;
}

export const inputClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

export const primaryButtonClass =
  "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
