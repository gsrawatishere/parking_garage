import { useEffect, useState } from "react";
import { api, Garage } from "../lib/api";
import { EmptyState } from "../components/Feedback";
import { StatCard } from "../components/StatCard";
import { money } from "../utils/format";
import { Page } from "../types/app";

export function OverviewPage({
  garages,
  selectedGarage,
  onNavigate,
}: {
  garages: Garage[];
  selectedGarage?: Garage;
  onNavigate: (page: Page) => void;
}) {
  const [report, setReport] = useState<{
    tickets: number;
    revenue: string | number;
  }>();
  const [availability, setAvailability] = useState<
    Record<string, Record<string, number>>
  >({});
  useEffect(() => {
    if (!selectedGarage) return;
    void api
      .dailyReport()
      .then(setReport)
      .catch(() => undefined);
    void api
      .availability(selectedGarage.id)
      .then((result) => setAvailability(result.availability))
      .catch(() => undefined);
  }, [selectedGarage]);
  const totals = Object.values(availability).reduce(
    (sum, statuses) =>
      sum + (statuses.AVAILABLE || 0) + (statuses.OCCUPIED || 0),
    0,
  );
  const available = Object.values(availability).reduce(
    (sum, statuses) => sum + (statuses.AVAILABLE || 0),
    0,
  );
  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <span className="date-kicker">
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </span>
          <h2>
            {selectedGarage
              ? `Good morning, ${selectedGarage.name}.`
              : "Your command centre awaits."}
          </h2>
        </div>
        <button
          type="button"
          className="primary-button compact"
          onClick={() => onNavigate("operations")}
        >
          Open floor control <span>→</span>
        </button>
      </div>
      <div className="stats-grid">
        <StatCard
          label="Available bays"
          value={`${available}`}
          note={
            totals
              ? `${Math.round((available / totals) * 100)}% of mapped capacity`
              : "Add spots to track capacity"
          }
        />
        <StatCard
          label="Parked today"
          value={`${report?.tickets ?? "—"}`}
          note="Completed sessions"
          tone="green"
        />
        <StatCard
          label="Today’s revenue"
          value={report ? money(report.revenue) : "—"}
          note="Settled sessions"
          tone="amber"
        />
        <StatCard
          label="Active garages"
          value={`${garages.filter((garage) => garage.status === "active").length}`}
          note="Across this workspace"
          tone="dark"
        />
      </div>
      <section className="dashboard-grid">
        <article className="panel occupancy-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CAPACITY MAP</span>
              <h3>Availability by vehicle type</h3>
            </div>
            <button
              type="button"
              className="text-button small"
              onClick={() => onNavigate("operations")}
            >
              Open live view →
            </button>
          </div>
          {Object.keys(availability).length ? (
            <div className="capacity-list">
              {Object.entries(availability).map(([type, statuses]) => {
                const total = Object.values(statuses).reduce(
                  (a, b) => a + b,
                  0,
                );
                const free = statuses.AVAILABLE || 0;
                return (
                  <div className="capacity-row" key={type}>
                    <div className="capacity-name">
                      <span className={`vehicle-symbol ${type.toLowerCase()}`}>
                        {type === "EV" ? "⚡" : "▰"}
                      </span>
                      <strong>{type}</strong>
                      <span>{total} mapped</span>
                    </div>
                    <div className="capacity-bar">
                      <i
                        style={{
                          width: `${total ? (free / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <strong className="capacity-number">
                      {free}
                      <small> free</small>
                    </strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No capacity map yet"
              detail="Add floors and parking spots in Garage setup."
              action={
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onNavigate("garages")}
                >
                  Configure inventory →
                </button>
              }
            />
          )}
        </article>
        <article className="panel quick-panel">
          <span className="eyebrow">QUICK START</span>
          <h3>Make the next move</h3>
          <p className="muted">The fastest path through a busy shift.</p>
          <div className="quick-actions">
            <button type="button" onClick={() => onNavigate("operations")}>
              <span className="quick-icon blue-bg">↗</span>
              <span>
                <strong>Check in a vehicle</strong>
                <small>Assign a bay and open a session</small>
              </span>
              <b>→</b>
            </button>
            <button type="button" onClick={() => onNavigate("vehicles")}>
              <span className="quick-icon yellow-bg">⌕</span>
              <span>
                <strong>Find a vehicle</strong>
                <small>Look up a plate or active ticket</small>
              </span>
              <b>→</b>
            </button>
            <button type="button" onClick={() => onNavigate("reports")}>
              <span className="quick-icon green-bg">▥</span>
              <span>
                <strong>Review today</strong>
                <small>See settled revenue and sessions</small>
              </span>
              <b>→</b>
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
