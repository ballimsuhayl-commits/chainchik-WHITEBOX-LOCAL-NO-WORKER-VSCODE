import { test, expect } from "vitest";
import pg from "pg";

test("db: can connect and query", async () => {
  const url = process.env.DATABASE_URL;
  expect(url).toBeTruthy();
  const client = new pg.Client({ connectionString: url! });
  await client.connect();
  const r = await client.query("SELECT 1 as n");
  expect(r.rows[0].n).toBe(1);
  await client.end();
});
