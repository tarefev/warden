import { useCallback, useState } from "react";
import type { SprintCreate } from "@warden/shared";
import { useCreateSprint, useMeta } from "@/lib/api";
import { inputClass, primaryButtonClass } from "@/lib/labels";
import SprintRow from "@/pages/sprints/_sections/SprintRow";

export default function SprintsPage() {
  const meta = useMeta();
  const createSprint = useCreateSprint();
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const onName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    [],
  );
  const onStartsAt = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setStartsAt(event.target.value),
    [],
  );
  const onEndsAt = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setEndsAt(event.target.value),
    [],
  );

  const onCreate = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = name.trim();
      if (!value) return;
      const body: SprintCreate = { name: value, startsAt: null, endsAt: null };
      if (startsAt) body.startsAt = startsAt;
      if (endsAt) body.endsAt = endsAt;
      createSprint.mutate(body, {
        onSuccess: () => {
          setName("");
          setStartsAt("");
          setEndsAt("");
        },
      });
    },
    [createSprint, endsAt, name, startsAt],
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Спринты</h1>
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-zinc-500">Название</span>
          <input
            value={name}
            onChange={onName}
            placeholder="Спринт 1"
            className={`${inputClass} w-56`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-zinc-500">Начало</span>
          <input type="date" value={startsAt} onChange={onStartsAt} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-zinc-500">Конец</span>
          <input type="date" value={endsAt} onChange={onEndsAt} className={inputClass} />
        </label>
        <button type="submit" disabled={createSprint.isPending} className={primaryButtonClass}>
          Создать
        </button>
      </form>
      {!!createSprint.error && (
        <div className="text-sm text-red-600">{createSprint.error.message}</div>
      )}
      {!!meta.isPending && <div className="text-sm text-zinc-500">Загрузка…</div>}
      {!!(!!meta.data && meta.data.sprints.length === 0) && (
        <div className="text-sm text-zinc-500">Спринтов пока нет</div>
      )}
      <div className="flex flex-col gap-2">
        {meta.data?.sprints.map((sprint) => (
          <SprintRow key={sprint.id} sprint={sprint} />
        ))}
      </div>
    </div>
  );
}
