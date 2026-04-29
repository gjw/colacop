import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}

export function createDb<DB>(pool: pg.Pool): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
