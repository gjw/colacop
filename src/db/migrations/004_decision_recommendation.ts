import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("decisions")
    .addColumn("recommendation", "text", (col) =>
      col.check(
        sql`recommendation in ('approve','reject','send_back','pending')`,
      ),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("decisions")
    .dropColumn("recommendation")
    .execute();
}
