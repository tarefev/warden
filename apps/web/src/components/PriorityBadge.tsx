import clsx from "clsx";
import { priorityClass } from "@/lib/labels";

export default function PriorityBadge({ priority }: { priority: number }) {
  return (
    <span
      className={clsx(
        "inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold",
        priorityClass({ priority }),
      )}
    >
      P{priority}
    </span>
  );
}
