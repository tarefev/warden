import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useIssue, useMeta } from "@/lib/api";
import IssueChildren from "@/pages/issue/_sections/IssueChildren";
import IssueComments from "@/pages/issue/_sections/IssueComments";
import IssueDescription from "@/pages/issue/_sections/IssueDescription";
import IssueFields from "@/pages/issue/_sections/IssueFields";
import IssueHistory from "@/pages/issue/_sections/IssueHistory";
import IssueLinks from "@/pages/issue/_sections/IssueLinks";
import IssueTitle from "@/pages/issue/_sections/IssueTitle";

export default function IssuePage() {
  const params = useParams();
  const issueKey = useMemo(() => {
    if (!params.key) return "";

    return params.key.toUpperCase();
  }, [params.key]);
  const issue = useIssue({ issueKey });
  const meta = useMeta();

  if (issue.isPending) return <div className="text-sm text-zinc-500">Загрузка…</div>;
  if (issue.error) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <div className="text-red-600">{issue.error.message}</div>
        <Link to="/issues?status=open" className="text-blue-600 hover:underline dark:text-blue-400">
          К списку задач
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="flex min-w-0 flex-col gap-6">
        <IssueTitle issue={issue.data} />
        <IssueDescription issue={issue.data} />
        <IssueChildren issue={issue.data} meta={meta.data} />
        <IssueLinks issue={issue.data} />
        <IssueComments issue={issue.data} meta={meta.data} />
        <IssueHistory issue={issue.data} meta={meta.data} />
      </div>
      <IssueFields issue={issue.data} meta={meta.data} />
    </div>
  );
}
