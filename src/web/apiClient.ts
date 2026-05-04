export type Lifecycle =
  | "awaiting_label"
  | "awaiting_application"
  | "queued"
  | "processing"
  | "processed"
  | "failed";

export interface JobRow {
  id: number;
  stem: string;
  image_path: string | null;
  image_url: string | null;
  application_path: string | null;
  lifecycle: Lifecycle;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent?: number;
  netContents: string;
  producerName: string;
  producerAddress: string;
  countryOfOrigin?: string;
}

export interface Layer1Row {
  id: number;
  job_id: number;
  field_name: string;
  verdict: "pass" | "fail" | "needs_review";
  extraction_confidence: "low" | "med" | "hi";
  extraction_confidence_raw: number | null;
  message: string;
  extracted_value: string | null;
}

export interface Layer2Row {
  id: number;
  job_id: number;
  field_name: string;
  verdict: "pass" | "fail" | "needs_review" | "needs_application_data";
  message: string;
  extracted_value: string | null;
  application_value: string | null;
}

export type DecisionOutcome = "approve" | "reject" | "send_back";

export type CitedFinding = { layer: 1 | 2; id: number };

export type MissingItem =
  | "abv_substantiation"
  | "net_contents_clarity"
  | "address_verification"
  | "class_type_designation"
  | "other";

export type Recommendation = "approve" | "reject" | "send_back" | "pending";

export interface DecisionRow {
  id: number;
  job_id: number;
  outcome: DecisionOutcome;
  note: string | null;
  cited_findings: CitedFinding[] | null;
  missing: MissingItem[] | null;
  recommendation: Recommendation | null;
  decided_at: string;
  decided_by: string;
}

export interface JobRowWithDecision extends JobRow {
  decision?: DecisionRow | null;
}

export interface JobDetail {
  job: JobRow;
  layer1: Layer1Row[];
  layer2: Layer2Row[];
  application: ApplicationData | null;
  decision: DecisionRow | null;
}

export async function listJobs(
  lifecycle?: Lifecycle,
  decided = false,
): Promise<JobRowWithDecision[]> {
  const params = new URLSearchParams();
  if (lifecycle) params.set("lifecycle", lifecycle);
  if (decided) params.set("decided", "true");
  const qs = params.toString();
  const url = qs ? `/api/jobs?${qs}` : "/api/jobs";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`listJobs ${res.status}`);
  const data = (await res.json()) as { jobs: JobRowWithDecision[] };
  return data.jobs;
}

export async function getJob(id: number): Promise<JobDetail> {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) throw new Error(`getJob ${res.status}`);
  return (await res.json()) as JobDetail;
}

type DecisionBody =
  | { outcome: "approve"; note?: string }
  | {
      outcome: "reject";
      cited_findings: CitedFinding[];
      note?: string;
    }
  | { outcome: "send_back"; missing: MissingItem[]; note?: string };

export async function postDecision(
  jobId: number,
  body: DecisionBody,
): Promise<DecisionRow> {
  const res = await fetch(`/api/jobs/${jobId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `postDecision ${res.status}`);
  }
  const data = (await res.json()) as { decision: DecisionRow };
  return data.decision;
}

export async function uploadFiles(
  image: File | null,
  application: File | null,
): Promise<{ stem: string }> {
  const fd = new FormData();
  if (image) fd.append("image", image);
  if (application) fd.append("application", application);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `upload ${res.status}`);
  }
  return (await res.json()) as { stem: string };
}

export async function resetDemo(): Promise<{
  jobsCleared: number;
  filesRemoved: number;
}> {
  const res = await fetch("/api/admin/reset", { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `reset ${res.status}`);
  }
  return (await res.json()) as { jobsCleared: number; filesRemoved: number };
}
