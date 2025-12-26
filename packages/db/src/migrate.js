import fs from "node:fs";
import path from "node:path";
import pg from "pg";
const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error("DATABASE_URL missing"); process.exit(1); }

const client = new Client({ connectionString: databaseUrl });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id text primary key,
    applied_at timestamptz not null default now()
  )
`);

const migrationsDir = path.resolve("packages/db/migrations");
const files = fs.readdirSync(migrationsDir).filter(f=>f.endsWith(".sql")).sort();

for (const f of files) {
  const { rows } = await client.query("SELECT id FROM schema_migrations WHERE id=$1", [f]);
  if (rows.length) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
  console.log("Applying", f);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [f]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Failed migration", f, e);
    process.exit(1);
  }
}

await client.end();
console.log("Migrations complete.");
