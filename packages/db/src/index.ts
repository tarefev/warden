import "@warden/db/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@warden/db/schema";

export * from "@warden/db/schema";

function pickDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  return "postgres://warden:warden@127.0.0.1:5432/warden";
}

export const sqlClient = postgres(pickDatabaseUrl(), { max: 10 });
export const db = drizzle(sqlClient, { schema });
export type Db = typeof db;
