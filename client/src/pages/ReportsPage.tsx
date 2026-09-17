import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { money } from "../utils/format";

export function ReportsPage() {
  const [daily, setDaily] = useState<{
    tickets: number;
    revenue: string | number;
  }>();
  const [monthly, setMonthly] = useState<{
    tickets: number;
    revenue: string | number;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([api.dailyReport(), api.monthlyReport()])
      .then(([day, month]) => {
        setDaily(day);
        setMonthly(month);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Unable to load reports.",
        ),
      );
  }, []);
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">PERFORMANCE</span>
          <h2>Revenue & reporting</h2>
        </div>
        <span className="date-kicker">Updated just now</span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="report-cards">
        <article className="report-card navy">
          <span>Today</span>
          <strong>{daily ? money(daily.revenue) : "—"}</strong>
          <small>{daily?.tickets ?? "—"} settled sessions</small>
          <div className="report-line" />
        </article>
        <article className="report-card cream">
          <span>This month</span>
          <strong>{monthly ? money(monthly.revenue) : "—"}</strong>
          <small>{monthly?.tickets ?? "—"} settled sessions</small>
          <div className="report-line" />
        </article>
      </div>
      <section className="panel report-detail">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">REPORT NOTES</span>
            <h3>What these numbers mean</h3>
          </div>
        </div>
        <div className="report-notes">
          <div>
            <span className="note-number">01</span>
            <p>
              <strong>Settled revenue</strong> includes completed check-out
              sessions with recorded amounts.
            </p>
          </div>
          <div>
            <span className="note-number">02</span>
            <p>
              <strong>Session count</strong> reflects tickets checked out during
              the reporting window.
            </p>
          </div>
          <div>
            <span className="note-number">03</span>
            <p>
              <strong>Daily caps</strong> are applied by the active rate policy
              at checkout.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
