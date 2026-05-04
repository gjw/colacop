import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("decisions")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("job_id", "integer", (col) =>
      col.notNull().unique().references("jobs.id").onDelete("cascade"),
    )
    .addColumn("outcome", "text", (col) =>
      col
        .notNull()
        .check(sql`outcome in ('approve','reject','send_back')`),
    )
    .addColumn("note", "text")
    .addColumn("cited_findings", "jsonb")
    .addColumn("missing", "jsonb")
    .addColumn("decided_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("decided_by", "text", (col) =>
      col.notNull().defaultTo("agent"),
    )
    .execute();

  await db.schema
    .createIndex("decisions_job_id_idx")
    .on("decisions")
    .column("job_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("decisions").ifExists().execute();
}
