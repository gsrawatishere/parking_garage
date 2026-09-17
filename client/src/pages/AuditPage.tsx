import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { EmptyState } from "../components/Feedback";
import { AuditLog } from "../types/app";
import { date, time } from "../utils/format";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void api
      .audit()
      .then((result) => setLogs(result.logs))
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load audit history.",
        ),
      );
  }, []);
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">ACCOUNTABILITY</span>
          <h2>Audit trail</h2>
        </div>
        <span className="count-badge">{logs.length} recent events</span>
      </div>
      <section className="panel audit-panel">
        {error && <div className="form-error">{error}</div>}
        {logs.length ? (
          logs.map((log) => (
            <div className="audit-row" key={log.id}>
              <span className="audit-icon">
                {log.action === "CHECKED_IN"
                  ? "↗"
                  : log.action === "CHECKED_OUT"
                    ? "↙"
                    : "•"}
              </span>
              <span>
                <strong>{log.action.replaceAll("_", " ")}</strong>
                <small>
                  {log.details || `${log.entityType.toLowerCase()} updated`} ·{" "}
                  {log.user?.name || "System"}
                  {log.garage ? ` · ${log.garage.name}` : ""}
                </small>
              </span>
              <time>
                {date(log.createdAt)} · {time(log.createdAt)}
              </time>
            </div>
          ))
        ) : (
          <EmptyState
            title="No audit events yet"
            detail="Actions taken in the workspace will be recorded here."
          />
        )}
      </section>
    </div>
  );
}
