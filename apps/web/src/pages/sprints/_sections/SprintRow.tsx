import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Sprint, SprintPatch } from "@warden/shared";
import { usePatchSprint } from "@/lib/api";
import { buttonClass, formatSprintDates, inputClass, primaryButtonClass } from "@/lib/labels";

type Draft = { name: string; startsAt: string; endsAt: string };

export default function SprintRow({ sprint }: { sprint: Sprint }) {
  const patchSprint = usePatchSprint();
  const [draft, setDraft] = useState<Draft | null>(null);

  const dates = useMemo(() => formatSprintDates({ sprint }), [sprint]);

  const onEdit = useCallback(() => {
    const draftFromSprint: Draft = { name: sprint.name, startsAt: "", endsAt: "" };
    if (sprint.startsAt) draftFromSprint.startsAt = sprint.startsAt;
    if (sprint.endsAt) draftFromSprint.endsAt = sprint.endsAt;
    setDraft(draftFromSprint);
  }, [sprint]);

  const onCancel = useCallback(() => setDraft(null), []);

  const onDraftChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name;
    const value = event.target.value;
    setDraft((prev) => {
      if (!prev) return prev;
      if (field === "name") return { ...prev, name: value };
      if (field === "startsAt") return { ...prev, startsAt: value };
      if (field === "endsAt") return { ...prev, endsAt: value };

      return prev;
    });
  }, []);

  const onSave = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!draft) return;
      const name = draft.name.trim();
      if (!name) return;
      const patch: SprintPatch = { name, startsAt: null, endsAt: null };
      if (draft.startsAt) patch.startsAt = draft.startsAt;
      if (draft.endsAt) patch.endsAt = draft.endsAt;
      patchSprint.mutate({ id: sprint.id, patch }, { onSuccess: () => setDraft(null) });
    },
    [draft, patchSprint, sprint.id],
  );

  const onToggleCurrent = useCallback(() => {
    patchSprint.mutate({ id: sprint.id, patch: { isCurrent: !sprint.isCurrent } });
  }, [patchSprint, sprint.id, sprint.isCurrent]);

  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      {!!(draft === null) && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">{sprint.name}</span>
          {!!sprint.isCurrent && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              текущий
            </span>
          )}
          <span className="text-xs text-zinc-500">{dates}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to={`/issues?sprint=${sprint.id}`}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Задачи
            </Link>
            <button
              type="button"
              onClick={onToggleCurrent}
              disabled={patchSprint.isPending}
              className={buttonClass}
            >
              {!!sprint.isCurrent && "Снять текущий"}
              {!sprint.isCurrent && "Сделать текущим"}
            </button>
            <button type="button" onClick={onEdit} className={buttonClass}>
              Изменить
            </button>
          </div>
        </div>
      )}
      {!!(draft !== null) && (
        <form onSubmit={onSave} className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            value={draft.name}
            onChange={onDraftChange}
            className={`${inputClass} w-56`}
          />
          <input
            name="startsAt"
            type="date"
            value={draft.startsAt}
            onChange={onDraftChange}
            className={inputClass}
          />
          <input
            name="endsAt"
            type="date"
            value={draft.endsAt}
            onChange={onDraftChange}
            className={inputClass}
          />
          <button type="submit" disabled={patchSprint.isPending} className={primaryButtonClass}>
            Сохранить
          </button>
          <button type="button" onClick={onCancel} className={buttonClass}>
            Отмена
          </button>
        </form>
      )}
      {!!patchSprint.error && (
        <div className="mt-1 text-xs text-red-600">{patchSprint.error.message}</div>
      )}
    </div>
  );
}
