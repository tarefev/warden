import { existsSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sqlClient } from "@warden/db";

const folder = new URL("../drizzle", import.meta.url).pathname;
if (!existsSync(`${folder}/meta/_journal.json`)) {
  console.log("no migrations yet");
  await sqlClient.end();
  process.exit(0);
}
await migrate(db, { migrationsFolder: folder });
await sqlClient.end();
console.log("migrations applied");
