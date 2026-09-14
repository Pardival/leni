import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { seedCategories } from "@/lib/categories";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

// Singleton conservé sur `globalThis` pour survivre au hot-reload de Next en dev.
const g = globalThis as unknown as { __leniDb?: Promise<Db> };

async function init(): Promise<Db> {
  const url = config.database.url;
  if (url.startsWith("file:")) {
    const file = url.slice("file:".length);
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const client = createClient({ url, authToken: config.database.authToken });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  await seedCategories(db);
  return db;
}

/** Retourne la connexion Drizzle, migrations appliquées et catégories système présentes. */
export function getDb(): Promise<Db> {
  if (!g.__leniDb) g.__leniDb = init();
  return g.__leniDb;
}

export { schema };
