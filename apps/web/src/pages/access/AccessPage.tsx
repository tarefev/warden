import { useCallback, useMemo, useState } from "react";
import type { Me } from "@warden/shared";
import { useAddMember, useApproveMember, useMembers, useRevokeMember } from "@/lib/api";

const buttonClass =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

export default function AccessPage({ me }: { me: Me }) {
  const members = useMembers();
  const addMember = useAddMember();
  const approve = useApproveMember();
  const revoke = useRevokeMember();
  const [login, setLogin] = useState("");

  const groups = useMemo(() => {
    const items = members.data;
    if (!items) return { requested: [], active: [], none: [] };

    return {
      requested: items.filter((m) => m.access === "requested"),
      active: items.filter((m) => m.access === "active"),
      none: items.filter((m) => m.access === "none"),
    };
  }, [members.data]);

  const readId = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const raw = event.currentTarget.dataset.id;
    if (!raw) return undefined;
    const id = Number.parseInt(raw, 10);
    if (Number.isNaN(id)) return undefined;

    return id;
  }, []);

  const onApprove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const id = readId(event);
      if (id === undefined) return;
      approve.mutate(id);
    },
    [approve, readId],
  );

  const onRevoke = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const id = readId(event);
      if (id === undefined) return;
      revoke.mutate(id);
    },
    [revoke, readId],
  );

  const onLoginChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLogin(event.target.value);
  }, []);

  const onAdd = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = login.trim();
      if (!value) return;
      addMember.mutate({ login: value }, { onSuccess: () => setLogin("") });
    },
    [addMember, login],
  );

  const mutationError = useMemo(() => {
    if (addMember.error) return addMember.error.message;
    if (approve.error) return approve.error.message;
    if (revoke.error) return revoke.error.message;

    return "";
  }, [addMember.error, approve.error, revoke.error]);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-xl font-semibold tracking-tight">Доступ</h1>
      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={login}
          onChange={onLoginChange}
          placeholder="Логин на GitHub"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" disabled={addMember.isPending} className={buttonClass}>
          Пустить
        </button>
      </form>
      {!!mutationError && <div className="text-sm text-red-600">{mutationError}</div>}
      {!!members.isPending && <div className="text-sm text-zinc-500">Загрузка…</div>}
      {!!members.error && <div className="text-sm text-red-600">{members.error.message}</div>}
      {!!(groups.requested.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">
            Заявки · {groups.requested.length}
          </h2>
          {groups.requested.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              {!!m.avatarUrl && <img src={m.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
              <span className="flex-1 text-sm">{m.login}</span>
              <button
                type="button"
                data-id={m.id}
                onClick={onApprove}
                disabled={approve.isPending}
                className={buttonClass}
              >
                Одобрить
              </button>
              <button
                type="button"
                data-id={m.id}
                onClick={onRevoke}
                disabled={revoke.isPending}
                className={buttonClass}
              >
                Отклонить
              </button>
            </div>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">
          С доступом · {groups.active.length}
        </h2>
        {groups.active.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            {!!m.avatarUrl && <img src={m.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
            <span className="flex-1 text-sm">{m.login}</span>
            {!!m.isAdmin && <span className="text-xs text-zinc-500">админ</span>}
            {!m.githubLinked && <span className="text-xs text-zinc-500">ещё не входил</span>}
            {!!(m.id !== me.id) && (
              <button
                type="button"
                data-id={m.id}
                onClick={onRevoke}
                disabled={revoke.isPending}
                className={buttonClass}
              >
                Убрать
              </button>
            )}
          </div>
        ))}
      </section>
      {!!(groups.none.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">
            Заходили без доступа · {groups.none.length}
          </h2>
          {groups.none.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              {!!m.avatarUrl && <img src={m.avatarUrl} alt="" className="h-6 w-6 rounded-full" />}
              <span className="flex-1 text-sm">{m.login}</span>
              <button
                type="button"
                data-id={m.id}
                onClick={onApprove}
                disabled={approve.isPending}
                className={buttonClass}
              >
                Пустить
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
