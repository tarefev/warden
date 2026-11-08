import type { IssueArea } from "@warden/shared";
import { areaLabels } from "@/lib/labels";

export default function AreaPill({ area }: { area: IssueArea | null }) {
  if (!area) return null;

  return (
    <span className="inline-block whitespace-nowrap rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {areaLabels[area]}
    </span>
  );
}
