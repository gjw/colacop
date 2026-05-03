import type { Generated } from "kysely";

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

export interface Database {
  jobs: JobsTable;
  layer1_results: Layer1ResultsTable;
  layer2_results: Layer2ResultsTable;
}
