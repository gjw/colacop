import { useEffect, useState } from "react";
import {
  type ApplicationData,
  type JobDetail,
  type JobRow,
  type Lifecycle,
  getJob,
  listJobs,
  resetDemo,
  uploadFiles,
} from "./apiClient";

const FIXTURE_STEMS = [
  "agave",
  "cointreau",
  "fireball",
  "rumble",
  "rumple",
  "shinok",
] as const;

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

const TRUNCATE_LIMIT = 120;

function TruncatedValue({ text }: { text: string }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= TRUNCATE_LIMIT) {
    return <span className="extracted-text">{text}</span>;
  }
  return (
    <span className="extracted-text">
      {expanded ? text : `${text.slice(0, TRUNCATE_LIMIT)}…`}{" "}
      <button
        type="button"
        className="show-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "show less" : "show more"}
      </button>
    </span>
  );
}

function ValueCell({ value }: { value: string | null }): JSX.Element {
  if (value === null) {
    return <span className="extracted-missing">(none)</span>;
  }
  if (value === "") {
    return <span className="extracted-missing">""</span>;
  }
  return <TruncatedValue text={value} />;
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

function ApplicationPanel({
  application,
}: {
  application: ApplicationData | null;
}): JSX.Element {
  if (application === null) {
    return (
      <div className="app-panel-wrap">
        <div className="app-panel-header">From application JSON</div>
        <div className="empty">No application data linked.</div>
      </div>
    );
  }
  const rows: Array<[string, string]> = [
    ["Brand", application.brandName],
    ["Class/type", application.classType],
    [
      "ABV",
      application.alcoholContent !== undefined
        ? `${application.alcoholContent}%`
        : "—",
    ],
    ["Net contents", application.netContents],
    ["Producer", application.producerName],
    ["Address", application.producerAddress],
    ["Country", application.countryOfOrigin ?? "—"],
  ];
  return (
    <div className="app-panel-wrap">
      <div className="app-panel-header">From application JSON</div>
      <dl className="app-panel">
        {rows.map(([k, v]) => (
          <div key={k} className="app-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Spinner(): JSX.Element {
  return <span className="spinner" aria-label="processing" role="status" />;
}

function LabelImagePanel({
  url,
  stem,
}: {
  url: string | null;
  stem: string;
}): JSX.Element {
  if (url === null) {
    return <div className="image-empty empty">No label image on file.</div>;
  }
  return (
    <a
      className="image-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Click to open full-size"
    >
      <img className="label-image" src={url} alt={`Label for ${stem}`} />
    </a>
  );
}

function JobDetailView({
  detail,
  onBack,
}: {
  detail: JobDetail;
  onBack: () => void;
}): JSX.Element {
  const { job, layer1, layer2, application } = detail;
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
      <div className="lifecycle-row">
        <LifecycleBadge value={job.lifecycle} />
        {job.lifecycle === "processing" && <Spinner />}
        {job.failure_reason && (
          <span style={{ marginLeft: 12, color: "var(--fail)" }}>
            {job.failure_reason}
          </span>
        )}
      </div>

      <div className="detail-section">
        <div className="label-app-grid">
          <LabelImagePanel url={job.image_url} stem={job.stem} />
          <ApplicationPanel application={application} />
        </div>
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
              <div className="msg">
                {r.message}
                <div className="extracted-line">
                  <span className="extracted-label">extracted:</span>{" "}
                  <ValueCell value={r.extracted_value} />
                </div>
              </div>
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
              <div className="msg">
                {r.message}
                <div className="extracted-line">
                  <span className="extracted-label">extracted:</span>{" "}
                  <ValueCell value={r.extracted_value} />
                  {" · "}
                  <span className="extracted-label">application:</span>{" "}
                  <ValueCell value={r.application_value} />
                </div>
              </div>
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
      <h2 className="section-heading">Upload your own</h2>
      <div className="upload-help">
        <p>
          In a real TTB filing, a producer submits a label image alongside an
          application form declaring the label's claimed values (brand,
          class/type, ABV, producer, etc.). This prototype represents that
          application as a JSON file — see the fixtures panel above for the
          expected shape.
        </p>
        <ul>
          <li>
            <strong>Both files</strong> → Layer 1 (label vs TTB regulation) and
            Layer 2 (label vs application) both run.
          </li>
          <li>
            <strong>Image only</strong> → Layer 1 runs; Layer 2 waits in
            <code> awaiting_application </code>
            until a JSON arrives.
          </li>
          <li>
            <strong>JSON only</strong> → nothing runs until the label image
            arrives.
          </li>
        </ul>
      </div>
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

function ConfirmModal({
  children,
  onConfirm,
  onCancel,
  busy,
  confirmLabel,
}: {
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  confirmLabel: string;
}): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FixturesPanel({
  onResetComplete,
}: {
  onResetComplete: () => void;
}): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  async function handleReset(): Promise<void> {
    setResetting(true);
    try {
      const result = await resetDemo();
      setFeedback(
        `Reset: cleared ${result.jobsCleared} job(s), removed ${result.filesRemoved} file(s).`,
      );
      setConfirmOpen(false);
      onResetComplete();
    } catch (err) {
      setFeedback(
        `Reset failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="fixtures-panel">
      <h2 className="section-heading">Sample fixtures</h2>
      <p className="fixtures-intro">
        Six committed pairs. Download an image + JSON together, then upload them
        below to exercise the full pipeline. Image-only and JSON-only uploads
        are also valid — see the upload notes.
      </p>
      <ul className="fixtures-list">
        {FIXTURE_STEMS.map((stem) => (
          <li key={stem} className="fixture-row">
            <span className="fixture-stem">{stem}</span>
            <a href={`/fixtures/${stem}.jpg`} download>
              {stem}.jpg
            </a>
            <a href={`/fixtures/${stem}.json`} download>
              {stem}.json
            </a>
          </li>
        ))}
      </ul>
      <div className="reset-row">
        <button
          type="button"
          className="reset-button"
          onClick={() => setConfirmOpen(true)}
        >
          Reset demo
        </button>
        {feedback && <span className="reset-feedback">{feedback}</span>}
      </div>
      {confirmOpen && (
        <ConfirmModal
          onConfirm={handleReset}
          onCancel={() => setConfirmOpen(false)}
          busy={resetting}
          confirmLabel="Reset demo"
        >
          <p>
            <strong>Reset the demo?</strong>
          </p>
          <p>
            This clears all jobs, layer-1 results, and layer-2 results from the
            database, and removes every file in <code>data/incoming/</code>.
          </p>
          <p>
            It does <strong>not</strong> repopulate the demo fixtures. After
            reset, use the download links above to grab a pair and upload it via
            the form below.
          </p>
        </ConfirmModal>
      )}
    </section>
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
      <FixturesPanel
        onResetComplete={() => {
          setSelected(null);
          void refresh();
        }}
      />
      <UploadForm onUploaded={() => void refresh()} />
    </div>
  );
}
