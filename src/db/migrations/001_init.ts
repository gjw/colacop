import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("jobs")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("stem", "text", (col) => col.notNull().unique())
    .addColumn("image_path", "text")
    .addColumn("application_path", "text")
    .addColumn("lifecycle", "text", (col) =>
      col
        .notNull()
        .check(
          sql`lifecycle in ('awaiting_label','awaiting_application','queued','processing','processed','failed')`,
        ),
    )
    .addColumn("failure_reason", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("jobs_lifecycle_idx")
    .on("jobs")
    .column("lifecycle")
    .execute();

  await db.schema
    .createTable("layer1_results")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("job_id", "integer", (col) =>
      col.notNull().references("jobs.id").onDelete("cascade"),
    )
    .addColumn("field_name", "text", (col) => col.notNull())
    .addColumn("verdict", "text", (col) =>
      col
        .notNull()
        .check(sql`verdict in ('pass','fail','needs_review')`),
    )
    .addColumn("extraction_confidence", "text", (col) =>
      col
        .notNull()
        .check(sql`extraction_confidence in ('low','med','hi')`),
    )
    .addColumn("extraction_confidence_raw", "double precision")
    .addColumn("message", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("layer1_results_job_id_idx")
    .on("layer1_results")
    .column("job_id")
    .execute();

  await db.schema
    .createTable("layer2_results")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("job_id", "integer", (col) =>
      col.notNull().references("jobs.id").onDelete("cascade"),
    )
    .addColumn("field_name", "text", (col) => col.notNull())
    .addColumn("verdict", "text", (col) =>
      col
        .notNull()
        .check(
          sql`verdict in ('pass','fail','needs_review','needs_application_data')`,
        ),
    )
    .addColumn("message", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("layer2_results_job_id_idx")
    .on("layer2_results")
    .column("job_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("layer2_results").ifExists().execute();
  await db.schema.dropTable("layer1_results").ifExists().execute();
  await db.schema.dropTable("jobs").ifExists().execute();
}
