import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZodType } from "zod";
import { meSchema, memberSchema, membersSchema, okSchema } from "@warden/shared";
import type { AddMember, Me } from "@warden/shared";

export class ApiError extends Error {
  readonly status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage({ res }: { res: Response }): Promise<string> {
  const text = await res.text();
  if (!text) return `${res.status}`;

  return `${res.status}: ${text.slice(0, 300)}`;
}

async function request<T>({
  path,
  schema,
  method,
}: {
  path: string;
  schema: ZodType<T>;
  method?: string;
}): Promise<T> {
  const res = await fetch(path, { method, credentials: "same-origin" });
  if (!res.ok) throw new ApiError({ status: res.status, message: await readErrorMessage({ res }) });

  return schema.parse(await res.json());
}

async function send<T>({
  path,
  schema,
  body,
}: {
  path: string;
  schema: ZodType<T>;
  body?: unknown;
}): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError({ status: res.status, message: await readErrorMessage({ res }) });

  return schema.parse(await res.json());
}

function isUnauthorized({ error }: { error: unknown }): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 401) return false;

  return true;
}

/** Текущий пользователь; null — не вошёл. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      try {
        return await request({ path: "/api/auth/me", schema: meSchema });
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
    mutationFn: () => send({ path: "/api/auth/logout", schema: okSchema }),
    onSettled: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.removeQueries({ queryKey: ["members"] });
    },
  });
}

export function useRequestAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => send({ path: "/api/auth/request-access", schema: meSchema }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => request({ path: "/api/admin/members", schema: membersSchema }),
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
    },
  });
}

export function useAddMember() {
  return useMembersMutation({
    mutationFn: (body: AddMember) =>
      send({ path: "/api/admin/members", schema: memberSchema, body }),
  });
}

export function useApproveMember() {
  return useMembersMutation({
    mutationFn: (id: number) =>
      send({ path: `/api/admin/members/${id}/approve`, schema: memberSchema }),
  });
}

export function useRevokeMember() {
  return useMembersMutation({
    mutationFn: (id: number) =>
      send({ path: `/api/admin/members/${id}/revoke`, schema: memberSchema }),
  });
}
