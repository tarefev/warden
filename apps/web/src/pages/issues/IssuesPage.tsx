import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { issueAreas, issueStatuses } from "@warden/shared";
import AreaPill from "@/components/AreaPill";
import MemberName from "@/components/MemberName";
import PriorityBadge from "@/components/PriorityBadge";
import StatusPill from "@/components/StatusPill";
import { useIssues, useMeta } from "@/lib/api";
import {
  areaLabels,
  findMember,
  findSprint,
  formatDate,
  inputClass,
  primaryButtonClass,
  statusLabels,
} from "@/lib/labels";

export default function IssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = useMeta();
  const search = useMemo(() => searchParams.toString(), [searchParams]);
  const issues = useIssues({ search });

  const readParam = useCallback(
    ({ name }: { name: string }) => {
      const value = searchParams.get(name);
      if (!value) return "";

      return value;
    },
    [searchParams],
  );

  const setParam = useCallback(
    ({ name, value }: { name: string; value: string }) => {
      const next = new URLSearchParams(searchParams);
      if (!value) next.delete(name);
      if (value) next.set(name, value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setParam({ name: event.target.name, value: event.target.value });
    },
    [setParam],
  );

  const onSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setParam({ name: "q", value: event.target.value });
    },
    [setParam],
  );

  const onReset = useCallback(() => {
    setSearchParams(new URLSearchParams({ status: "open" }), { replace: true });
  }, [setSearchParams]);

  const activeMembers = useMemo(() => {
    if (!meta.data) return [];

    return meta.data.members.filter((m) => m.access === "active");
  }, [meta.data]);

  const countLine = useMemo(() => {
    if (!issues.data) return "";
    if (issues.data.items.length === issues.data.total) return `${issues.data.total}`;

    return `${issues.data.items.length} из ${issues.data.total}`;
  }, [issues.data]);

  const newIssueLink = useMemo(() => {
    const sprint = searchParams.get("sprint");
    if (!sprint) return "/issues/new";
    if (!/^\d+$/.test(sprint)) return "/issues/new";

    return `/issues/new?sprint=${sprint}`;
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Поиск: название или WRD-12"
          value={readParam({ name: "q" })}
          onChange={onSearch}
          className={`${inputClass} w-64`}
        />
        <select
          name="assignee"
          value={readParam({ name: "assignee" })}
          onChange={onSelect}
          className={inputClass}
        >
          <option value="">Все исполнители</option>
          <option value="me">Мои</option>
          <option value="none">Без исполнителя</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.login}
            </option>
          ))}
        </select>
        <select
          name="sprint"
          value={readParam({ name: "sprint" })}
          onChange={onSelect}
          className={inputClass}
        >
          <option value="">Все спринты</option>
          <option value="current">Текущий спринт</option>
          <option value="none">Без спринта</option>
          {meta.data?.sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          value={readParam({ name: "status" })}
          onChange={onSelect}
          className={inputClass}
        >
          <option value="">Все статусы</option>
          <option value="open">Незакрытые</option>
          {issueStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <select
          name="area"
          value={readParam({ name: "area" })}
          onChange={onSelect}
          className={inputClass}
        >
          <option value="">Все области</option>
          {issueAreas.map((a) => (
            <option key={a} value={a}>
              {areaLabels[a]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onReset} className="text-sm text-zinc-500 hover:underline">
          Сбросить
        </button>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500">{countLine}</span>
          <Link to={newIssueLink} className={primaryButtonClass}>
            Новая задача
          </Link>
        </div>
      </div>
      {!!issues.isPending && <div className="text-sm text-zinc-500">Загрузка…</div>}
      {!!issues.error && <div className="text-sm text-red-600">{issues.error.message}</div>}
      {!!(!!issues.data && issues.data.items.length === 0) && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Задач нет
        </div>
      )}
      {!!(!!issues.data && issues.data.items.length > 0) && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Номер</th>
                <th className="px-3 py-2">P</th>
                <th className="px-3 py-2">Название</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Исполнитель</th>
                <th className="px-3 py-2">Спринт</th>
                <th className="px-3 py-2">Обновлена</th>
              </tr>
            </thead>
            <tbody>
              {issues.data?.items.map((issue) => (
                <tr
                  key={issue.id}
                  className="border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    <Link
                      to={`/issues/${issue.key}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {issue.key}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <PriorityBadge priority={issue.priority} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/issues/${issue.key}`} className="hover:underline">
                        {issue.title}
                      </Link>
                      <AreaPill area={issue.area} />
                      {!!issue.parentKey && (
                        <Link
                          to={`/issues/${issue.parentKey}`}
                          className="font-mono text-[11px] text-zinc-400 hover:underline"
                        >
                          ↑ {issue.parentKey}
                        </Link>
                      )}
                      {!!(issue.childrenCount > 0) && (
                        <span className="text-[11px] text-zinc-400">
                          подзадачи {issue.childrenDone}/{issue.childrenCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={issue.status} />
                  </td>
                  <td className="px-3 py-2">
                    <MemberName member={findMember({ meta: meta.data, id: issue.assigneeId })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {findSprint({ meta: meta.data, id: issue.sprintId })?.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {formatDate({ iso: issue.updatedAt })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
