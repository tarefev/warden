import { useCallback, useState } from "react";
import type { IssueDetails } from "@warden/shared";
import { useAddLink, useDeleteLink } from "@/lib/api";
import { buttonClass, inputClass } from "@/lib/labels";

export default function IssueLinks({ issue }: { issue: IssueDetails }) {
  const addLink = useAddLink({ issueKey: issue.key });
  const deleteLink = useDeleteLink({ issueKey: issue.key });
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const onUrl = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value),
    [],
  );
  const onTitle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value),
    [],
  );

  const onAdd = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = url.trim();
      if (!value) return;
      addLink.mutate(
        { url: value, title: title.trim() },
        {
          onSuccess: () => {
            setUrl("");
            setTitle("");
          },
        },
      );
    },
    [addLink, title, url],
  );

  const onDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const raw = event.currentTarget.dataset.id;
      if (!raw) return;
      const id = Number.parseInt(raw, 10);
      if (Number.isNaN(id)) return;
      deleteLink.mutate(id);
    },
    [deleteLink],
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase text-zinc-500">Ссылки на PR и MR</h2>
      {!!(issue.links.length > 0) && (
        <div className="flex flex-col gap-1">
          {issue.links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 text-sm">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-blue-600 hover:underline dark:text-blue-400"
              >
                {!!link.title && link.title}
                {!link.title && link.url}
              </a>
              <button
                type="button"
                data-id={link.id}
                onClick={onDelete}
                disabled={deleteLink.isPending}
                className="text-xs text-zinc-400 hover:text-red-600"
              >
                убрать
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onAdd} className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={onUrl}
          placeholder="https://github.com/…/pull/12"
          className={`${inputClass} min-w-64 flex-1`}
        />
        <input
          value={title}
          onChange={onTitle}
          placeholder="Подпись, необязательно"
          className={`${inputClass} w-48`}
        />
        <button type="submit" disabled={addLink.isPending} className={buttonClass}>
          Добавить
        </button>
      </form>
      {!!addLink.error && <div className="text-sm text-red-600">{addLink.error.message}</div>}
      {!!deleteLink.error && <div className="text-sm text-red-600">{deleteLink.error.message}</div>}
    </section>
  );
}
