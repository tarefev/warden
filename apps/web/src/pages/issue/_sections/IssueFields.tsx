import { useCallback, useMemo, useState } from "react";
import { issueAreas, issueStatuses, parseIssueKey } from "@warden/shared";
import type { IssueDetails, Meta } from "@warden/shared";
import MemberName from "@/components/MemberName";
import { usePatchIssue } from "@/lib/api";
import {
  areaLabels,
  buttonClass,
  findMember,
  formatDateTime,
  fromSelectValue,
  inputClass,
  isIssueArea,
  isIssueStatus,
  priorities,
  statusLabels,
  toSelectValue,
} from "@/lib/labels";

const fieldClass = "flex flex-col gap-1";
const captionClass = "text-xs uppercase text-zinc-500";

export default function IssueFields({
  issue,
  meta,
}: {
  issue: IssueDetails;
  meta: Meta | undefined;
}) {
  const patch = usePatchIssue({ issueKey: issue.key });
  const [parentDraft, setParentDraft] = useState<string | null>(null);
  const [parentError, setParentError] = useState("");

  const activeMembers = useMemo(() => {
    if (!meta) return [];

    return meta.members.filter((m) => m.access === "active");
  }, [meta]);

  const areaValue = useMemo(() => {
    if (!issue.area) return "";

    return issue.area;
  }, [issue.area]);

  const parentValue = useMemo(() => {
    if (parentDraft !== null) return parentDraft;
    if (!issue.parentKey) return "";

    return issue.parentKey;
  }, [issue.parentKey, parentDraft]);

  const onStatus = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isIssueStatus(event.target.value)) return;
      patch.mutate({ status: event.target.value });
    },
    [patch],
  );

  const onPriority = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const priority = Number.parseInt(event.target.value, 10);
      if (Number.isNaN(priority)) return;
      patch.mutate({ priority });
    },
    [patch],
  );

  const onArea = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!event.target.value) {
        patch.mutate({ area: null });
        return;
      }
      if (!isIssueArea(event.target.value)) return;
      patch.mutate({ area: event.target.value });
    },
    [patch],
  );

  const onAssignee = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      patch.mutate({ assigneeId: fromSelectValue({ value: event.target.value }) });
    },
    [patch],
  );

  const onSprint = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      patch.mutate({ sprintId: fromSelectValue({ value: event.target.value }) });
    },
    [patch],
  );

  const onParentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setParentDraft(event.target.value);
    setParentError("");
  }, []);

  const onParentSave = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (parentDraft === null) return;
      const text = parentDraft.trim();
      if (!text) {
        patch.mutate({ parentId: null }, { onSuccess: () => setParentDraft(null) });
        return;
      }
      const parentId = parseIssueKey({ key: text });
      if (parentId === undefined) {
        setParentError("Номер задачи, например WRD-12");
        return;
      }
      patch.mutate({ parentId }, { onSuccess: () => setParentDraft(null) });
    },
    [parentDraft, patch],
  );

  return (
    <aside className="flex flex-col gap-4 text-sm">
      <label className={fieldClass}>
        <span className={captionClass}>Статус</span>
        <select
          value={issue.status}
          onChange={onStatus}
          disabled={patch.isPending}
          className={inputClass}
        >
          {issueStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className={captionClass}>Приоритет</span>
        <select
          value={issue.priority}
          onChange={onPriority}
          disabled={patch.isPending}
          className={inputClass}
        >
          {priorities.map((p) => (
            <option key={p} value={p}>
              P{p}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className={captionClass}>Область</span>
        <select
          value={areaValue}
          onChange={onArea}
          disabled={patch.isPending}
          className={inputClass}
        >
          <option value="">—</option>
          {issueAreas.map((a) => (
            <option key={a} value={a}>
              {areaLabels[a]}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className={captionClass}>Исполнитель</span>
        <select
          value={toSelectValue({ id: issue.assigneeId })}
          onChange={onAssignee}
          disabled={patch.isPending}
          className={inputClass}
        >
          <option value="">—</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.login}
            </option>
          ))}
        </select>
      </label>
      <label className={fieldClass}>
        <span className={captionClass}>Спринт</span>
        <select
          value={toSelectValue({ id: issue.sprintId })}
          onChange={onSprint}
          disabled={patch.isPending}
          className={inputClass}
        >
          <option value="">—</option>
          {meta?.sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {!!(issue.childrenCount === 0) && (
        <form onSubmit={onParentSave} className={fieldClass}>
          <span className={captionClass}>Родитель</span>
          <div className="flex gap-2">
            <input
              value={parentValue}
              onChange={onParentChange}
              placeholder="WRD-12"
              className={`${inputClass} min-w-0 flex-1`}
            />
            {!!(parentDraft !== null) && (
              <button type="submit" disabled={patch.isPending} className={buttonClass}>
                ОК
              </button>
            )}
          </div>
          {!!parentError && <span className="text-xs text-red-600">{parentError}</span>}
        </form>
      )}
      {!!patch.error && <div className="text-xs text-red-600">{patch.error.message}</div>}
      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span>Автор</span>
          <MemberName member={findMember({ meta, id: issue.authorId })} />
        </div>
        <div>Создана {formatDateTime({ iso: issue.createdAt })}</div>
        <div>Обновлена {formatDateTime({ iso: issue.updatedAt })}</div>
        {!!issue.doneAt && <div>Готова {formatDateTime({ iso: issue.doneAt })}</div>}
      </div>
    </aside>
  );
}
