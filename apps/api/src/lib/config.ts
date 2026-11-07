export type AuthConfig = {
  appUrl: string;
  clientId: string;
  clientSecret: string;
  adminLogin: string;
  secureCookies: boolean;
};

function readRequired({ name }: { name: string }): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} не задан в окружении`);

  return value;
}

function pickSecureCookies({ appUrl }: { appUrl: string }): boolean {
  if (appUrl.startsWith("https://")) return true;

  return false;
}

export function readAuthConfig(): AuthConfig {
  const appUrl = readRequired({ name: "APP_URL" }).replace(/\/+$/, "");

  return {
    appUrl,
    clientId: readRequired({ name: "GITHUB_CLIENT_ID" }),
    clientSecret: readRequired({ name: "GITHUB_CLIENT_SECRET" }),
    adminLogin: readRequired({ name: "WARDEN_ADMIN_LOGIN" }),
    secureCookies: pickSecureCookies({ appUrl }),
  };
}
