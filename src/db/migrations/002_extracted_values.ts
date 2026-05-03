import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("layer1_results")
    .addColumn("extracted_value", "text")
    .execute();

  await db.schema
    .alterTable("layer2_results")
    .addColumn("extracted_value", "text")
    .execute();

  await db.schema
    .alterTable("layer2_results")
    .addColumn("application_value", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("layer2_results")
    .dropColumn("application_value")
    .execute();

  await db.schema
    .alterTable("layer2_results")
    .dropColumn("extracted_value")
    .execute();

  await db.schema
    .alterTable("layer1_results")
    .dropColumn("extracted_value")
    .execute();
}
