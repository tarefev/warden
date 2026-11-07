import { useCallback } from "react";
import type { Me } from "@warden/shared";
import UserBadge from "@/components/UserBadge";
import { useLogout, useRequestAccess } from "@/lib/api";

export default function NoAccessPage({ me }: { me: Me }) {
  const requestAccess = useRequestAccess();
  const logout = useLogout();

  const onRequest = useCallback(() => {
    requestAccess.mutate();
  }, [requestAccess]);

  const onLogout = useCallback(() => {
    logout.mutate();
  }, [logout]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-2xl font-semibold tracking-tight">Warden</div>
        <UserBadge me={me} />
        {!!(me.access === "none") && (
          <>
            <div className="text-sm">Нет доступа</div>
            <button
              type="button"
              onClick={onRequest}
              disabled={requestAccess.isPending}
              className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Попросить доступ
            </button>
          </>
        )}
        {!!(me.access === "requested") && (
          <div className="text-sm">Заявка отправлена, ждём одобрения.</div>
        )}
        {!!requestAccess.error && (
          <div className="text-sm text-red-600">{requestAccess.error.message}</div>
        )}
        <button type="button" onClick={onLogout} className="text-sm text-zinc-500 hover:underline">
          Выйти
        </button>
      </div>
    </div>
  );
}
