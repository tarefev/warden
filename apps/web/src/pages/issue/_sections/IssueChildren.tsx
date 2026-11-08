import { Link } from "react-router-dom";
import type { IssueDetails, Meta } from "@warden/shared";
import MemberName from "@/components/MemberName";
import PriorityBadge from "@/components/PriorityBadge";
import StatusPill from "@/components/StatusPill";
import { findMember } from "@/lib/labels";

export default function IssueChildren({
  issue,
  meta,
}: {
  issue: IssueDetails;
  meta: Meta | undefined;
}) {
  if (issue.parentId !== null) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase text-zinc-500">
          Подзадачи · {issue.childrenDone}/{issue.childrenCount}
        </h2>
        <Link
          to={`/issues/new?parent=${issue.key}`}
          className="text-xs text-zinc-500 hover:underline"
        >
          Добавить подзадачу
        </Link>
      </div>
      {!!(issue.children.length > 0) && (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {issue.children.map((child) => (
            <div key={child.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Link
                to={`/issues/${child.key}`}
                className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {child.key}
              </Link>
              <PriorityBadge priority={child.priority} />
              <Link to={`/issues/${child.key}`} className="min-w-0 flex-1 truncate hover:underline">
                {child.title}
              </Link>
              <MemberName member={findMember({ meta, id: child.assigneeId })} />
              <StatusPill status={child.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
