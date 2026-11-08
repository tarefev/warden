import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import type { IssueDetails } from "@warden/shared";
import AreaPill from "@/components/AreaPill";
import { usePatchIssue } from "@/lib/api";
import { buttonClass, inputClass, primaryButtonClass } from "@/lib/labels";

export default function IssueTitle({ issue }: { issue: IssueDetails }) {
  const patch = usePatchIssue({ issueKey: issue.key });
  const [draft, setDraft] = useState<string | null>(null);

  const onEdit = useCallback(() => setDraft(issue.title), [issue.title]);
  const onCancel = useCallback(() => setDraft(null), []);
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    [],
  );

  const onSave = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (draft === null) return;
      const title = draft.trim();
      if (!title) return;
      patch.mutate({ title }, { onSuccess: () => setDraft(null) });
    },
    [draft, patch],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
        {!!issue.parentKey && (
          <Link to={`/issues/${issue.parentKey}`} className="hover:underline">
            {issue.parentKey}
          </Link>
        )}
        {!!issue.parentKey && <span>/</span>}
        <span>{issue.key}</span>
        <AreaPill area={issue.area} />
      </div>
      {!!(draft === null) && (
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
          <button
            type="button"
            onClick={onEdit}
            className="mt-1 text-xs text-zinc-500 hover:underline"
          >
            Изменить
          </button>
        </div>
      )}
      {!!(draft !== null) && (
        <form onSubmit={onSave} className="flex flex-col gap-2">
          <input
            value={draft}
            onChange={onChange}
            autoFocus={true}
            className={`${inputClass} text-lg`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={patch.isPending} className={primaryButtonClass}>
              Сохранить
            </button>
            <button type="button" onClick={onCancel} className={buttonClass}>
              Отмена
            </button>
          </div>
        </form>
      )}
      {!!patch.error && <div className="text-sm text-red-600">{patch.error.message}</div>}
    </div>
  );
}
