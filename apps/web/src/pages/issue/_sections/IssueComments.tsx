import { useCallback, useState } from "react";
import type { IssueDetails, Meta } from "@warden/shared";
import Markdown from "@/components/Markdown";
import MemberName from "@/components/MemberName";
import { useAddComment } from "@/lib/api";
import { findMember, formatDateTime, inputClass, primaryButtonClass } from "@/lib/labels";

export default function IssueComments({
  issue,
  meta,
}: {
  issue: IssueDetails;
  meta: Meta | undefined;
}) {
  const addComment = useAddComment({ issueKey: issue.key });
  const [text, setText] = useState("");

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value),
    [],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const body = text.trim();
      if (!body) return;
      addComment.mutate({ body }, { onSuccess: () => setText("") });
    },
    [addComment, text],
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase text-zinc-500">
        Комментарии · {issue.comments.length}
      </h2>
      {issue.comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            <MemberName member={findMember({ meta, id: comment.authorId })} />
            <span>{formatDateTime({ iso: comment.createdAt })}</span>
          </div>
          <Markdown text={comment.body} />
        </div>
      ))}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={onChange}
          rows={3}
          placeholder="Комментарий, Markdown"
          className={`${inputClass} font-mono`}
        />
        <div>
          <button type="submit" disabled={addComment.isPending} className={primaryButtonClass}>
            Отправить
          </button>
        </div>
      </form>
      {!!addComment.error && <div className="text-sm text-red-600">{addComment.error.message}</div>}
    </section>
  );
}
