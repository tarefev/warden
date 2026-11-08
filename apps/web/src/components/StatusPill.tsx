import clsx from "clsx";
import type { IssueStatus } from "@warden/shared";
import { statusClasses, statusLabels } from "@/lib/labels";

export default function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span
      className={clsx(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
