import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import {
  issueDetailsSchema,
  issueListSchema,
  meSchema,
  memberSchema,
  membersSchema,
  metaSchema,
  okSchema,
  sprintSchema,
} from "@warden/shared";
import type {
  AddMember,
  CommentCreate,
  IssueCreate,
  IssueDetails,
  IssuePatch,
  LinkCreate,
  Me,
  SprintCreate,
  SprintPatch,
} from "@warden/shared";

export class ApiError extends Error {
  readonly status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

/** Текст ошибки API: поле error из JSON, иначе код ответа. */
async function readErrorMessage({ res }: { res: Response }): Promise<string> {
  const text = await res.text();
  if (!text) return `Ошибка ${res.status}`;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof parsed.error === "string"
    ) {
      return parsed.error;
    }
  } catch {
    // не JSON — покажем как есть
  }

  return `Ошибка ${res.status}: ${text.slice(0, 300)}`;
}

async function call<T>({
  path,
  schema,
  method = "GET",
  body,
}: {
  path: string;
  schema: ZodType<T>;
  method?: string;
  body?: unknown;
}): Promise<T> {
  const init: RequestInit = { method, credentials: "same-origin" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  if (!res.ok) throw new ApiError({ status: res.status, message: await readErrorMessage({ res }) });

  return schema.parse(await res.json());
}

function isUnauthorized({ error }: { error: unknown }): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 401) return false;

  return true;
}

/* ───────────── Вход и доступ ───────────── */

/** Текущий пользователь; null — не вошёл. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      try {
        return await call({ path: "/api/auth/me", schema: meSchema });
      } catch (error) {
        if (isUnauthorized({ error })) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => call({ path: "/api/auth/logout", schema: okSchema, method: "POST" }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(["me"], null);
    },
  });
}

export function useRequestAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => call({ path: "/api/auth/request-access", schema: meSchema, method: "POST" }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => call({ path: "/api/admin/members", schema: membersSchema }),
  });
}

function useMembersMutation<TVariables>({
  mutationFn,
}: {
  mutationFn: (variables: TVariables) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
  });
}

export function useAddMember() {
  return useMembersMutation({
    mutationFn: (body: AddMember) =>
      call({ path: "/api/admin/members", schema: memberSchema, method: "POST", body }),
  });
}

export function useApproveMember() {
  return useMembersMutation({
    mutationFn: (id: number) =>
      call({ path: `/api/admin/members/${id}/approve`, schema: memberSchema, method: "POST" }),
  });
}

export function useRevokeMember() {
  return useMembersMutation({
    mutationFn: (id: number) =>
      call({ path: `/api/admin/members/${id}/revoke`, schema: memberSchema, method: "POST" }),
  });
}

/* ───────────── Трекер ───────────── */

/** Участники и спринты: справочник для селектов и подписей. */
export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => call({ path: "/api/meta", schema: metaSchema }),
    staleTime: 30_000,
  });
}

export function useIssues({ search }: { search: string }) {
  return useQuery({
    queryKey: ["issues", search],
    queryFn: () => call({ path: `/api/issues?${search}`, schema: issueListSchema }),
  });
}

export function useIssue({ issueKey }: { issueKey: string }) {
  return useQuery({
    queryKey: ["issue", issueKey],
    queryFn: () => call({ path: `/api/issues/${issueKey}`, schema: issueDetailsSchema }),
    enabled: issueKey.length > 0,
  });
}

/** Мутации карточки возвращают свежую карточку: кладём её в кеш, список и родителя перечитываем. */
function useIssueMutation<TVariables>({
  issueKey,
  mutationFn,
}: {
  issueKey: string;
  mutationFn: (variables: TVariables) => Promise<IssueDetails>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (details) => {
      queryClient.setQueryData(["issue", issueKey], details);
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
      if (details.parentKey)
        void queryClient.invalidateQueries({ queryKey: ["issue", details.parentKey] });
    },
  });
}

export function usePatchIssue({ issueKey }: { issueKey: string }) {
  return useIssueMutation({
    issueKey,
    mutationFn: (body: IssuePatch) =>
      call({ path: `/api/issues/${issueKey}`, schema: issueDetailsSchema, method: "PATCH", body }),
  });
}

export function useAddComment({ issueKey }: { issueKey: string }) {
  return useIssueMutation({
    issueKey,
    mutationFn: (body: CommentCreate) =>
      call({
        path: `/api/issues/${issueKey}/comments`,
        schema: issueDetailsSchema,
        method: "POST",
        body,
      }),
  });
}

export function useAddLink({ issueKey }: { issueKey: string }) {
  return useIssueMutation({
    issueKey,
    mutationFn: (body: LinkCreate) =>
      call({
        path: `/api/issues/${issueKey}/links`,
        schema: issueDetailsSchema,
        method: "POST",
        body,
      }),
  });
}

export function useDeleteLink({ issueKey }: { issueKey: string }) {
  return useIssueMutation({
    issueKey,
    mutationFn: (linkId: number) =>
      call({
        path: `/api/issues/${issueKey}/links/${linkId}`,
        schema: issueDetailsSchema,
        method: "DELETE",
      }),
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: IssueCreate) =>
      call({ path: "/api/issues", schema: issueDetailsSchema, method: "POST", body }),
    onSuccess: (details) => {
      queryClient.setQueryData(["issue", details.key], details);
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
      if (details.parentKey)
        void queryClient.invalidateQueries({ queryKey: ["issue", details.parentKey] });
    },
  });
}

function useSprintMutation<TVariables>({
  mutationFn,
}: {
  mutationFn: (variables: TVariables) => Promise<unknown>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meta"] });
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

export function useCreateSprint() {
  return useSprintMutation({
    mutationFn: (body: SprintCreate) =>
      call({ path: "/api/sprints", schema: sprintSchema, method: "POST", body }),
  });
}

export function usePatchSprint() {
  return useSprintMutation({
    mutationFn: ({ id, patch }: { id: number; patch: SprintPatch }) =>
      call({ path: `/api/sprints/${id}`, schema: sprintSchema, method: "PATCH", body: patch }),
  });
}
