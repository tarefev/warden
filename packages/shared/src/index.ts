import { z } from "zod";

/** none — вошёл, доступа нет; requested — попросил доступ; active — допущен. */
export const accessStates = ["none", "requested", "active"] as const;
export type AccessState = (typeof accessStates)[number];

export const meSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isAdmin: z.boolean(),
  access: z.enum(accessStates),
});
export type Me = z.infer<typeof meSchema>;

export const memberSchema = meSchema.extend({
  githubLinked: z.boolean(),
  requestedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const membersSchema = z.array(memberSchema);

/** Логин GitHub: латиница, цифры и дефис, до 39 символов. */
export const addMemberSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1)
    .max(39)
    .regex(/^[A-Za-z0-9-]+$/),
});
export type AddMember = z.infer<typeof addMemberSchema>;

export const okSchema = z.object({ ok: z.literal(true) });
