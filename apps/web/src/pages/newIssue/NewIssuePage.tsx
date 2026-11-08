import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PRIORITY_DEFAULT, issueAreas, issueStatuses, parseIssueKey } from "@warden/shared";
import type { IssueArea, IssueCreate, IssueStatus } from "@warden/shared";
import { useCreateIssue, useMeta } from "@/lib/api";
import {
  areaLabels,
  buttonClass,
  fromSelectValue,
  inputClass,
  isIssueArea,
  isIssueStatus,
  primaryButtonClass,
  priorities,
  statusLabels,
} from "@/lib/labels";

const labelClass = "flex flex-col gap-1 text-sm";
const captionClass = "text-xs uppercase text-zinc-500";

export default function NewIssuePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const meta = useMeta();
  const createIssue = useCreateIssue();

  const initialParent = useMemo(() => {
    const value = searchParams.get("parent");
    if (!value) return "";

    return value;
  }, [searchParams]);

  const initialSprint = useMemo(() => {
    const value = searchParams.get("sprint");
    if (value) return value;
    if (!meta.data) return "";
    const current = meta.data.sprints.find((s) => s.isCurrent);
    if (!current) return "";

    return `${current.id}`;
  }, [meta.data, searchParams]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("new");
  const [priority, setPriority] = useState(PRIORITY_DEFAULT);
  const [area, setArea] = useState<IssueArea | null>(null);
  const [assignee, setAssignee] = useState("");
  const [sprintChoice, setSprintChoice] = useState<string | undefined>(undefined);
  const [parent, setParent] = useState(initialParent);
  const [formError, setFormError] = useState("");

  const sprint = useMemo(() => {
    if (sprintChoice === undefined) return initialSprint;

    return sprintChoice;
  }, [initialSprint, sprintChoice]);

  const areaValue = useMemo(() => {
    if (!area) return "";

    return area;
  }, [area]);

  const activeMembers = useMemo(() => {
    if (!meta.data) return [];

    return meta.data.members.filter((m) => m.access === "active");
  }, [meta.data]);

  const onTitle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value),
    [],
  );
  const onDescription = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value),
    [],
  );
  const onAssignee = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setAssignee(event.target.value),
    [],
  );
  const onSprint = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => setSprintChoice(event.target.value),
    [],
  );
  const onParent = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setParent(event.target.value),
    [],
  );

  const onStatus = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isIssueStatus(event.target.value)) return;
    setStatus(event.target.value);
  }, []);

  const onPriority = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(value)) return;
    setPriority(value);
  }, []);

  const onArea = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!event.target.value) {
      setArea(null);
      return;
    }
    if (!isIssueArea(event.target.value)) return;
    setArea(event.target.value);
  }, []);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError("");
      if (!title.trim()) {
        setFormError("Нужно название");
        return;
      }
      const parentText = parent.trim();
      const parsedParent = parseIssueKey({ key: parentText });
      if (!!parentText && parsedParent === undefined) {
        setFormError("Родитель — номер задачи, например WRD-12");
        return;
      }
      const body: IssueCreate = {
        title: title.trim(),
        description,
        status,
        priority,
        area,
        assigneeId: fromSelectValue({ value: assignee }),
        sprintId: fromSelectValue({ value: sprint }),
        parentId: null,
      };
      if (parsedParent !== undefined) body.parentId = parsedParent;
      createIssue.mutate(body, { onSuccess: (details) => navigate(`/issues/${details.key}`) });
    },
    [area, assignee, createIssue, description, navigate, parent, priority, sprint, status, title],
  );

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Новая задача</h1>
      <label className={labelClass}>
        <span className={captionClass}>Название</span>
        <input value={title} onChange={onTitle} autoFocus={true} className={inputClass} />
      </label>
      <label className={labelClass}>
        <span className={captionClass}>Описание, Markdown</span>
        <textarea
          value={description}
          onChange={onDescription}
          rows={8}
          className={`${inputClass} font-mono`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          <span className={captionClass}>Статус</span>
          <select value={status} onChange={onStatus} className={inputClass}>
            {issueStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Приоритет</span>
          <select value={priority} onChange={onPriority} className={inputClass}>
            {priorities.map((p) => (
              <option key={p} value={p}>
                P{p}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Область</span>
          <select value={areaValue} onChange={onArea} className={inputClass}>
            <option value="">—</option>
            {issueAreas.map((a) => (
              <option key={a} value={a}>
                {areaLabels[a]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Исполнитель</span>
          <select value={assignee} onChange={onAssignee} className={inputClass}>
            <option value="">—</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.login}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Спринт</span>
          <select value={sprint} onChange={onSprint} className={inputClass}>
            <option value="">—</option>
            {meta.data?.sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Родитель</span>
          <input value={parent} onChange={onParent} placeholder="WRD-12" className={inputClass} />
        </label>
      </div>
      {!!formError && <div className="text-sm text-red-600">{formError}</div>}
      {!!createIssue.error && (
        <div className="text-sm text-red-600">{createIssue.error.message}</div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={createIssue.isPending} className={primaryButtonClass}>
          Создать
        </button>
        <Link to="/issues?status=open" className={buttonClass}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
