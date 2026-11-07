import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Локально переменные берутся из .env в корне репо; на сервере их задаёт окружение.
const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
