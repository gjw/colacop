import { useEffect, useState } from "react";
import {
  type ApplicationData,
  type CitedFinding,
  type DecisionOutcome,
  type DecisionRow,
  type JobDetail,
  type JobRowWithDecision,
  type Layer1Row,
  type Layer2Row,
  type Lifecycle,
  type MissingItem,
  getJob,
  listJobs,
  postDecision,
  resetDemo,
  uploadFiles,
} from "./apiClient";
import { renderWithCitations } from "./citations";

const FIXTURE_STEMS = [
  "agave",
  "cointreau",
  "fireball",
  "rumble",
  "rumple",
  "shinok",
] as const;

type Filter = Lifecycle | "all" | "decided";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All (active)" },
  { key: "processed", label: "Processed" },
  { key: "queued", label: "Queued" },
  { key: "processing", label: "Processing" },
  { key: "awaiting_application", label: "Awaiting application" },
  { key: "awaiting_label", label: "Awaiting label" },
  { key: "failed", label: "Failed" },
  { key: "decided", label: "Decided" },
];

const MISSING_OPTIONS: Array<{ key: MissingItem; label: string }> = [
  { key: "abv_substantiation", label: "ABV substantiation" },
  { key: "net_contents_clarity", label: "Net contents clarity" },
  { key: "address_verification", label: "Address verification" },
  {
    key: "class_type_designation",
    label: "Class / type designation",
  },
  { key: "other", label: "Other (specify in note)" },
];

function decisionLabel(outcome: DecisionOutcome): string {
  if (outcome === "approve") return "approved";
  if (outcome === "reject") return "rejected";
  return "sent back";
}

function ConfidenceBadge({ value }: { value: "low" | "med" | "hi" }): JSX.Element {
  return <span className={`confidence-badge ${value}`}>{value}</span>;
}

function LifecycleBadge({ value }: { value: Lifecycle }): JSX.Element {
  return <span className={`lifecycle ${value}`}>{value.replace("_", " ")}</span>;
}

function VerdictBadge({ value }: { value: string }): JSX.Element {
  return <span className={`verdict ${value}`}>{value.replace(/_/g, " ")}</span>;
}

function DecisionBadge({ value }: { value: DecisionOutcome }): JSX.Element {
  return (
    <span className={`verdict decision-${value}`}>{decisionLabel(value)}</span>
  );
}

function recommendationLabel(value: DecisionOutcome): string {
  if (value === "approve") return "approve";
  if (value === "reject") return "reject";
  return "send back";
}

function OverrideBadge({
  decision,
}: {
  decision: DecisionRow;
}): JSX.Element | null {
  const r = decision.recommendation;
  if (r === null || r === "pending" || r === decision.outcome) return null;
  return (
    <span
      className="verdict override-badge"
      title={`HITL adjudication diverges from tool recommendation (recommended: ${recommendationLabel(r)}).`}
    >
      override
    </span>
  );
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
  decidedView,
}: {
  jobs: JobRowWithDecision[];
  onSelect: (id: number) => void;
  decidedView: boolean;
}): JSX.Element {
  if (jobs.length === 0) {
    return <div className="empty">No jobs match this filter yet.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Stem</th>
          <th>{decidedView ? "Decision" : "Lifecycle"}</th>
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
              {decidedView && j.decision ? (
                <>
                  <DecisionBadge value={j.decision.outcome} />
                  <OverrideBadge decision={j.decision} />
                </>
              ) : (
                <LifecycleBadge value={j.lifecycle} />
              )}
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
    ["Brand", application.brandName ?? "—"],
    ["Class/type", application.classType ?? "—"],
    [
      "ABV",
      application.alcoholContent !== undefined
        ? `${application.alcoholContent}%`
        : "—",
    ],
    ["Net contents", application.netContents ?? "—"],
    ["Producer", application.producerName ?? "—"],
    ["Address", application.producerAddress ?? "—"],
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

function findingKey(layer: 1 | 2, id: number): string {
  return `${layer}:${id}`;
}

function findingLabel(
  layer: 1 | 2,
  row: Layer1Row | Layer2Row,
): string {
  return `L${layer} · ${row.field_name} (${row.verdict.replace(/_/g, " ")})`;
}

function DecisionSummary({
  decision,
  layer1,
  layer2,
}: {
  decision: DecisionRow;
  layer1: Layer1Row[];
  layer2: Layer2Row[];
}): JSX.Element {
  const findings = decision.cited_findings ?? [];
  const findingRows = findings
    .map((c) => {
      const row =
        c.layer === 1
          ? layer1.find((r) => r.id === c.id)
          : layer2.find((r) => r.id === c.id);
      if (!row) return null;
      return { c, label: findingLabel(c.layer, row) };
    })
    .filter((x): x is { c: CitedFinding; label: string } => x !== null);
  const missing = decision.missing ?? [];
  return (
    <div className="decision-summary">
      <div className="decision-summary-head">
        <DecisionBadge value={decision.outcome} />
        <OverrideBadge decision={decision} />
        <span className="decision-meta">
          {new Date(decision.decided_at).toLocaleString()} ·{" "}
          {decision.decided_by}
        </span>
      </div>
      {decision.note && (
        <p className="decision-note">{decision.note}</p>
      )}
      {findingRows.length > 0 && (
        <div className="decision-cited">
          <div className="decision-list-label">Cited findings:</div>
          <ul>
            {findingRows.map(({ c, label }) => (
              <li key={findingKey(c.layer, c.id)}>{label}</li>
            ))}
          </ul>
        </div>
      )}
      {missing.length > 0 && (
        <div className="decision-cited">
          <div className="decision-list-label">Missing:</div>
          <ul>
            {missing.map((m) => {
              const opt = MISSING_OPTIONS.find((o) => o.key === m);
              return <li key={m}>{opt ? opt.label : m}</li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DecisionForm({
  layer1,
  layer2,
  jobId,
  onDecided,
}: {
  layer1: Layer1Row[];
  layer2: Layer2Row[];
  jobId: number;
  onDecided: () => void;
}): JSX.Element {
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [note, setNote] = useState("");
  const [cited, setCited] = useState<Set<string>>(new Set());
  const [missing, setMissing] = useState<Set<MissingItem>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  function reset(): void {
    setOutcome(null);
    setNote("");
    setCited(new Set());
    setMissing(new Set());
    setError("");
  }

  function toggleCited(layer: 1 | 2, id: number): void {
    const k = findingKey(layer, id);
    const next = new Set(cited);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setCited(next);
  }

  function toggleMissing(item: MissingItem): void {
    const next = new Set(missing);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setMissing(next);
  }

  async function submit(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const trimmedNote = note.trim();
      if (outcome === "approve") {
        await postDecision(jobId, {
          outcome: "approve",
          ...(trimmedNote ? { note: trimmedNote } : {}),
        });
      } else if (outcome === "reject") {
        const cited_findings: CitedFinding[] = Array.from(cited).map((k) => {
          const [layerStr, idStr] = k.split(":");
          const layer = (layerStr === "1" ? 1 : 2) as 1 | 2;
          return { layer, id: Number(idStr) };
        });
        await postDecision(jobId, {
          outcome: "reject",
          cited_findings,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        });
      } else if (outcome === "send_back") {
        await postDecision(jobId, {
          outcome: "send_back",
          missing: Array.from(missing),
          ...(trimmedNote ? { note: trimmedNote } : {}),
        });
      }
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (outcome === null) {
    return (
      <div className="decision-controls">
        <button
          type="button"
          className="decision-btn approve"
          onClick={() => setOutcome("approve")}
        >
          Approve
        </button>
        <button
          type="button"
          className="decision-btn reject"
          onClick={() => setOutcome("reject")}
        >
          Reject
        </button>
        <button
          type="button"
          className="decision-btn send_back"
          onClick={() => setOutcome("send_back")}
        >
          Send back
        </button>
      </div>
    );
  }

  const canSubmit =
    outcome === "approve"
      ? true
      : outcome === "reject"
        ? cited.size > 0
        : missing.size > 0 &&
          (!missing.has("other") || note.trim().length > 0);

  return (
    <div className="decision-form">
      <div className="decision-form-head">
        <DecisionBadge value={outcome} />
        <button
          type="button"
          className="link-btn"
          onClick={reset}
          disabled={busy}
        >
          change
        </button>
      </div>

      {outcome === "reject" && (
        <div className="decision-citations">
          <div className="decision-list-label">
            Cite the findings driving this rejection (at least one):
          </div>
          <ul className="decision-cite-list">
            {layer1.map((r) => {
              const k = findingKey(1, r.id);
              return (
                <li key={k}>
                  <label>
                    <input
                      type="checkbox"
                      checked={cited.has(k)}
                      onChange={() => toggleCited(1, r.id)}
                    />{" "}
                    {findingLabel(1, r)}
                  </label>
                </li>
              );
            })}
            {layer2.map((r) => {
              const k = findingKey(2, r.id);
              return (
                <li key={k}>
                  <label>
                    <input
                      type="checkbox"
                      checked={cited.has(k)}
                      onChange={() => toggleCited(2, r.id)}
                    />{" "}
                    {findingLabel(2, r)}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {outcome === "send_back" && (
        <div className="decision-citations">
          <div className="decision-list-label">
            What's missing (at least one):
          </div>
          <ul className="decision-cite-list">
            {MISSING_OPTIONS.map((opt) => (
              <li key={opt.key}>
                <label>
                  <input
                    type="checkbox"
                    checked={missing.has(opt.key)}
                    onChange={() => toggleMissing(opt.key)}
                  />{" "}
                  {opt.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="decision-note-label">
        Note{" "}
        {outcome === "send_back" && missing.has("other") ? (
          <span className="required-marker">(required for "Other")</span>
        ) : (
          <span className="optional-marker">(optional)</span>
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={
            outcome === "approve"
              ? "Optional rationale or context."
              : outcome === "reject"
                ? "Optional explanation of the rejection."
                : "What needs to come back; required if you ticked 'Other'."
          }
        />
      </label>

      <div className="decision-actions">
        <button type="button" onClick={reset} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => void submit()}
          disabled={!canSubmit || busy}
        >
          {busy
            ? "Saving..."
            : outcome === "approve"
              ? "Confirm approve"
              : outcome === "reject"
                ? "Confirm reject"
                : "Confirm send back"}
        </button>
      </div>

      {error && <div className="feedback error">{error}</div>}
    </div>
  );
}

function JobDetailView({
  detail,
  onBack,
  onDecided,
}: {
  detail: JobDetail;
  onBack: () => void;
  onDecided: () => void;
}): JSX.Element {
  const { job, layer1, layer2, application, decision } = detail;
  const rollup = rollupVerdict(detail);
  return (
    <div>
      <header>
        <h1>
          {job.stem}{" "}
          {decision ? (
            <>
              <DecisionBadge value={decision.outcome} />
              <OverrideBadge decision={decision} />
            </>
          ) : (
            <VerdictBadge value={rollup} />
          )}
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
                {renderWithCitations(r.message)}
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
                {renderWithCitations(r.message)}
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

      <div className="detail-section">
        <h2>Adjudicate</h2>
        {decision ? (
          <DecisionSummary
            decision={decision}
            layer1={layer1}
            layer2={layer2}
          />
        ) : job.lifecycle === "processed" ? (
          <>
            <p className="adjudicate-helper">
              Record your decision on this application. The findings above are
              this tool's recommendation; the decision is yours.
            </p>
            <DecisionForm
              jobId={job.id}
              layer1={layer1}
              layer2={layer2}
              onDecided={onDecided}
            />
          </>
        ) : (
          <div className="empty">
            Adjudication is available once the job reaches{" "}
            <code>processed</code>.
          </div>
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
      <h2 className="section-heading">Upload your own pair</h2>
      <div className="upload-help">
        <p>
          In a real TTB filing, a producer submits a label image alongside an
          application form declaring the label's claimed values (brand,
          class/type, ABV, producer, etc.). This prototype represents that
          application as a JSON file — download any pair from{" "}
          <strong>Sample fixtures</strong> above to see the expected JSON
          shape.
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
  const [filter, setFilter] = useState<Filter>("all");
  const [jobs, setJobs] = useState<JobRowWithDecision[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const decidedView = filter === "decided";

  async function refresh(): Promise<void> {
    const lifecycle =
      filter === "all" || filter === "decided"
        ? undefined
        : (filter as Lifecycle);
    const rows = await listJobs(lifecycle, decidedView);
    setJobs(rows);
  }

  async function refreshDetail(): Promise<void> {
    if (selected === null) return;
    const d = await getJob(selected);
    setDetail(d);
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
        <JobDetailView
          detail={detail}
          onBack={() => setSelected(null)}
          onDecided={() => {
            void refreshDetail();
            void refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>colacop · agent-assisted TTB label pre-review</h1>
        <div className="crumbs">queue-first pre-review</div>
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
      <JobList jobs={jobs} onSelect={setSelected} decidedView={decidedView} />
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
