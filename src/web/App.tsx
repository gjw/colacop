import { useEffect, useState } from "react";
import {
  type JobDetail,
  type JobRow,
  type Lifecycle,
  getJob,
  listJobs,
  uploadFiles,
} from "./apiClient";

const FILTERS: Array<{ key: Lifecycle | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "processed", label: "Processed" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing" },
  { key: "awaiting_application", label: "Awaiting application" },
  { key: "awaiting_label", label: "Awaiting label" },
  { key: "failed", label: "Failed" },
];

function ConfidenceBadge({ value }: { value: "low" | "med" | "hi" }): JSX.Element {
  return <span className={`confidence-badge ${value}`}>{value}</span>;
}

function LifecycleBadge({ value }: { value: Lifecycle }): JSX.Element {
  return <span className={`lifecycle ${value}`}>{value.replace("_", " ")}</span>;
}

function VerdictBadge({ value }: { value: string }): JSX.Element {
  return <span className={`verdict ${value}`}>{value.replace(/_/g, " ")}</span>;
}

function rollupVerdict(detail: JobDetail): string {
  const verdicts = [
    ...detail.layer1.map((r) => r.verdict),
    ...detail.layer2.map((r) => r.verdict),
  ];
  if (verdicts.includes("fail")) return "fail";
  if (verdicts.includes("needs_review")) return "needs_review";
  if (verdicts.length > 0 && verdicts.every((v) => v === "pass")) return "pass";
  return "pending";
}

function JobList({
  jobs,
  onSelect,
}: {
  jobs: JobRow[];
  onSelect: (id: number) => void;
}): JSX.Element {
  if (jobs.length === 0) {
    return <div className="empty">No jobs match this filter yet.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Stem</th>
          <th>Lifecycle</th>
          <th>Image</th>
          <th>Application</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((j) => (
          <tr key={j.id} onClick={() => onSelect(j.id)}>
            <td>{j.stem}</td>
            <td>
              <LifecycleBadge value={j.lifecycle} />
            </td>
            <td>{j.image_path ? "✓" : "—"}</td>
            <td>{j.application_path ? "✓" : "—"}</td>
            <td>{new Date(j.updated_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JobDetailView({
  detail,
  onBack,
}: {
  detail: JobDetail;
  onBack: () => void;
}): JSX.Element {
  const { job, layer1, layer2 } = detail;
  const rollup = rollupVerdict(detail);
  return (
    <div>
      <header>
        <h1>
          {job.stem} <VerdictBadge value={rollup} />
        </h1>
        <div className="crumbs">
          <a
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            href="#"
          >
            ← back to queue
          </a>
        </div>
      </header>
      <div>
        <LifecycleBadge value={job.lifecycle} />
        {job.failure_reason && (
          <span style={{ marginLeft: 12, color: "var(--fail)" }}>
            {job.failure_reason}
          </span>
        )}
      </div>

      <div className="detail-section">
        <h2>Layer 1 — well-formedness (label vs regulation)</h2>
        {layer1.length === 0 ? (
          <div className="empty">Layer 1 has not run yet.</div>
        ) : (
          layer1.map((r) => (
            <div key={r.id} className="field-row">
              <div className="name">
                {r.field_name}
                <ConfidenceBadge value={r.extraction_confidence} />
              </div>
              <div>
                <VerdictBadge value={r.verdict} />
              </div>
              <div className="msg">{r.message}</div>
            </div>
          ))
        )}
      </div>

      <div className="detail-section">
        <h2>Layer 2 — comparison (label vs application)</h2>
        {layer2.length === 0 ? (
          <div className="empty">Layer 2 has not run yet.</div>
        ) : (
          layer2.map((r) => (
            <div key={r.id} className="field-row">
              <div className="name">{r.field_name}</div>
              <div>
                <VerdictBadge value={r.verdict} />
              </div>
              <div className="msg">{r.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UploadForm({ onUploaded }: { onUploaded: () => void }): JSX.Element {
  const [image, setImage] = useState<File | null>(null);
  const [application, setApplication] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!image && !application) {
      setFeedback("Pick at least an image or an application JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await uploadFiles(image, application);
      setFeedback(`Uploaded as ${res.stem}.`);
      setImage(null);
      setApplication(null);
      onUploaded();
    } catch (err) {
      setFeedback(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={submit}>
      <label>
        Label image (.jpg, .png, .webp){" "}
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        />
      </label>
      <label>
        Application data (.json){" "}
        <input
          type="file"
          accept=".json"
          onChange={(e) => setApplication(e.target.files?.[0] ?? null)}
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? "Uploading..." : "Submit"}
      </button>
      {feedback && <div className="feedback">{feedback}</div>}
    </form>
  );
}

export function App(): JSX.Element {
  const [filter, setFilter] = useState<Lifecycle | "all">("all");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);

  async function refresh(): Promise<void> {
    const rows = await listJobs(filter === "all" ? undefined : filter);
    setJobs(rows);
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selected === null) {
      setDetail(null);
      return;
    }
    void getJob(selected).then(setDetail);
    const interval = window.setInterval(() => {
      void getJob(selected).then(setDetail);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [selected]);

  if (selected !== null && detail) {
    return (
      <div className="app">
        <JobDetailView detail={detail} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>colacop · TTB label review</h1>
        <div className="crumbs">queue-first review</div>
      </header>
      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={f.key === filter ? "active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <JobList jobs={jobs} onSelect={setSelected} />
      <UploadForm onUploaded={() => void refresh()} />
    </div>
  );
}
