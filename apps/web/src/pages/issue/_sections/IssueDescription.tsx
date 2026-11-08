import { useCallback, useState } from "react";
import type { IssueDetails } from "@warden/shared";
import Markdown from "@/components/Markdown";
import { usePatchIssue } from "@/lib/api";
import { buttonClass, inputClass, primaryButtonClass } from "@/lib/labels";

export default function IssueDescription({ issue }: { issue: IssueDetails }) {
  const patch = usePatchIssue({ issueKey: issue.key });
  const [draft, setDraft] = useState<string | null>(null);

  const onEdit = useCallback(() => setDraft(issue.description), [issue.description]);
  const onCancel = useCallback(() => setDraft(null), []);
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value),
    [],
  );

  const onSave = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (draft === null) return;
      patch.mutate({ description: draft }, { onSuccess: () => setDraft(null) });
    },
    [draft, patch],
  );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">Описание</h2>
        {!!(draft === null) && (
          <button type="button" onClick={onEdit} className="text-xs text-zinc-500 hover:underline">
            Изменить
          </button>
        )}
      </div>
      {!!(draft === null && !!issue.description) && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Markdown text={issue.description} />
        </div>
      )}
      {!!(draft === null && !issue.description) && (
        <div className="text-sm text-zinc-400">Описания нет</div>
      )}
      {!!(draft !== null) && (
        <form onSubmit={onSave} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={onChange}
            rows={12}
            autoFocus={true}
            className={`${inputClass} font-mono`}
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
    </section>
  );
}
