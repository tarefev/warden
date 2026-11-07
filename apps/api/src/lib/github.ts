import { z } from "zod";
import type { AuthConfig } from "@warden/api/lib/config";

const tokenResponseSchema = z.object({ access_token: z.string() });

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});
export type GithubUser = z.infer<typeof githubUserSchema>;

export function buildRedirectUri({ config }: { config: AuthConfig }): string {
  return `${config.appUrl}/api/auth/github/callback`;
}

export function buildAuthorizeUrl({
  config,
  state,
}: {
  config: AuthConfig;
  state: string;
}): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", buildRedirectUri({ config }));
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");

  return url.toString();
}

export async function exchangeCode({
  config,
  code,
}: {
  config: AuthConfig;
  code: string;
}): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: buildRedirectUri({ config }),
    }),
  });
  if (!res.ok) throw new Error(`github token exchange: ${res.status}`);
  const parsed = tokenResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("github token exchange: no access_token in response");

  return parsed.data.access_token;
}

export async function fetchGithubUser({ token }: { token: string }): Promise<GithubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "warden",
    },
  });
  if (!res.ok) throw new Error(`github user: ${res.status}`);
  const parsed = githubUserSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("github user: unexpected response");

  return parsed.data;
}
