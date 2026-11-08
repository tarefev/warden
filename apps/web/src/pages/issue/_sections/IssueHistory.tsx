import { useCallback } from "react";
import type { HistoryEntry, IssueDetails, Meta } from "@warden/shared";
import MemberName from "@/components/MemberName";
import {
  areaLabels,
  findMember,
  formatDateTime,
  historyLabels,
  isIssueArea,
  isIssueStatus,
  statusLabels,
} from "@/lib/labels";

export default function IssueHistory({
  issue,
  meta,
}: {
  issue: IssueDetails;
  meta: Meta | undefined;
}) {
  const formatValue = useCallback(
    ({ entry, value }: { entry: HistoryEntry; value: string | null }) => {
      if (value === null) return "—";
      if (entry.field === "status" && isIssueStatus(value)) return statusLabels[value];
      if (entry.field === "area" && isIssueArea(value)) return areaLabels[value];
      if (entry.field === "priority") return `P${value}`;

      return value;
    },
    [],
  );

  const describe = useCallback(
    ({ entry }: { entry: HistoryEntry }) => {
      if (entry.field === "created") return historyLabels.created;
      if (entry.field === "description") return "изменил описание";
      if (entry.field === "link_added")
        return `${historyLabels.link_added} ${formatValue({ entry, value: entry.newValue })}`;
      if (entry.field === "link_removed")
        return `${historyLabels.link_removed} ${formatValue({ entry, value: entry.oldValue })}`;

      return `${historyLabels[entry.field]}: ${formatValue({ entry, value: entry.oldValue })} → ${formatValue({ entry, value: entry.newValue })}`;
    },
    [formatValue],
  );

  if (issue.history.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase text-zinc-500">История</h2>
      <div className="flex flex-col gap-1.5 text-sm">
        {issue.history.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs text-zinc-400">
              {formatDateTime({ iso: entry.createdAt })}
            </span>
            {!!(entry.actorId === null) && <span className="text-zinc-500">система</span>}
            {!!(entry.actorId !== null) && (
              <MemberName member={findMember({ meta, id: entry.actorId })} />
            )}
            <span className="min-w-0 break-words text-zinc-700 dark:text-zinc-300">
              {describe({ entry })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
