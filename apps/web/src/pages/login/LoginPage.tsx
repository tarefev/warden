import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export default function LoginPage() {
  const [searchParams] = useSearchParams();

  const errorText = useMemo(() => {
    const code = searchParams.get("authError");
    if (!code) return "";
    if (code === "cancelled") return "Вход отменён на GitHub.";
    if (code === "state") return "Сессия входа устарела, попробуй ещё раз.";

    return "GitHub не пустил. Попробуй ещё раз.";
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-2xl font-semibold tracking-tight">Warden</div>
        <a
          href="/api/auth/github"
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Войти через GitHub
        </a>
        {!!errorText && <div className="text-center text-sm text-red-600">{errorText}</div>}
      </div>
    </div>
  );
}
