import clsx from "clsx";
import { useCallback } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { Me } from "@warden/shared";
import UserBadge from "@/components/UserBadge";
import { useLogout } from "@/lib/api";

export default function Layout({ me }: { me: Me }) {
  const logout = useLogout();

  const onLogout = useCallback(() => {
    logout.mutate();
  }, [logout]);

  const navClass = useCallback(
    ({ isActive }: { isActive: boolean }) =>
      clsx(
        "rounded-md px-3 py-1.5",
        !!isActive && "bg-zinc-200 dark:bg-zinc-800",
        !isActive && "hover:bg-zinc-100 dark:hover:bg-zinc-900",
      ),
    [],
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <NavLink to="/issues?status=open" className="text-lg font-semibold tracking-tight">
            Warden
          </NavLink>
          <nav className="flex gap-1 text-sm">
            <NavLink to="/issues?status=open" className={navClass}>
              Задачи
            </NavLink>
            <NavLink to="/sprints" className={navClass}>
              Спринты
            </NavLink>
            {!!me.isAdmin && (
              <NavLink to="/admin/access" className={navClass}>
                Доступ
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <UserBadge me={me} />
            <button
              type="button"
              onClick={onLogout}
              disabled={logout.isPending}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-900"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
