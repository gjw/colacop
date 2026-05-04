import type { ColumnType, Generated } from "kysely";

export type Lifecycle =
  | "awaiting_label"
  | "awaiting_application"
  | "queued"
  | "processing"
  | "processed"
  | "failed";

export type Layer1Verdict = "pass" | "fail" | "needs_review";

export type Layer2Verdict =
  | "pass"
  | "fail"
  | "needs_review"
  | "needs_application_data";

export type ExtractionConfidence = "low" | "med" | "hi";

export interface JobsTable {
  id: Generated<number>;
  stem: string;
  image_path: string | null;
  application_path: string | null;
  lifecycle: Lifecycle;
  failure_reason: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Layer1ResultsTable {
  id: Generated<number>;
  job_id: number;
  field_name: string;
  verdict: Layer1Verdict;
  extraction_confidence: ExtractionConfidence;
  extraction_confidence_raw: number | null;
  message: string;
  extracted_value: string | null;
  created_at: Generated<Date>;
}

export interface Layer2ResultsTable {
  id: Generated<number>;
  job_id: number;
  field_name: string;
  verdict: Layer2Verdict;
  message: string;
  extracted_value: string | null;
  application_value: string | null;
  created_at: Generated<Date>;
}

export type DecisionOutcome = "approve" | "reject" | "send_back";

export type CitedFinding = { layer: 1 | 2; id: number };

export type MissingItem =
  | "abv_substantiation"
  | "net_contents_clarity"
  | "address_verification"
  | "class_type_designation"
  | "other";

// JSONB columns: pg returns parsed JSON on read but does not stringify on
// write — so insert/update accept a string and select returns the typed shape.
export type JsonbColumn<T> = ColumnType<T, string | null, string | null>;

export interface DecisionsTable {
  id: Generated<number>;
  job_id: number;
  outcome: DecisionOutcome;
  note: string | null;
  cited_findings: JsonbColumn<CitedFinding[] | null>;
  missing: JsonbColumn<MissingItem[] | null>;
  decided_at: Generated<Date>;
  decided_by: Generated<string>;
}

export interface Database {
  jobs: JobsTable;
  layer1_results: Layer1ResultsTable;
  layer2_results: Layer2ResultsTable;
  decisions: DecisionsTable;
}
