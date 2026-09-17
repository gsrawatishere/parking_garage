import { ReactNode } from "react";
import { Garage, User } from "../lib/api";
import { Page } from "../types/app";

const navigation: Array<[Page, string, string]> = [
  ["overview", "Overview", "◒"],
  ["operations", "Floor control", "⌗"],
  ["garages", "Garage setup", "▦"],
  ["vehicles", "Vehicles", "○"],
  ["reports", "Reports", "↗"],
  ["audit", "Audit trail", "≡"],
];

export function AppShell({
  user,
  page,
  garages,
  selectedGarageId,
  onPageChange,
  onGarageChange,
  onLogout,
  onRefresh,
  children,
}: {
  user: User;
  page: Page;
  garages: Garage[];
  selectedGarageId: string;
  onPageChange: (page: Page) => void;
  onGarageChange: (garageId: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const selectedGarage = garages.find(
    (garage) => garage.id === selectedGarageId,
  );
  const titles: Record<Page, [string, string]> = {
    overview: ["Overview", "A live read on the work that matters today."],
    operations: [
      "Floor control",
      "Move cars through the garage without losing the thread.",
    ],
    garages: ["Garage setup", "Shape your floors, bays, and pricing rules."],
    vehicles: [
      "Vehicle desk",
      "Find a plate, register a vehicle, and see its active session.",
    ],
    reports: [
      "Revenue & reporting",
      "A clean view of completed sessions and cash flow.",
    ],
    audit: ["Audit trail", "Every meaningful change, in order."],
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <strong>Parkline</strong>
            <span>Garage operations</span>
          </div>
        </div>
        <div className="workspace-switcher">
          <span className="mini-label">WORKSPACE</span>
          <select
            value={selectedGarageId}
            onChange={(event) => onGarageChange(event.target.value)}
          >
            <option value="">Choose garage</option>
            {garages.map((garage) => (
              <option key={garage.id} value={garage.id}>
                {garage.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="main-nav">
          {navigation.map(([key, label, icon]) => (
            <button
              type="button"
              key={key}
              className={page === key ? "nav-item active" : "nav-item"}
              onClick={() => onPageChange(key)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-note">
            <i className="signal-dot green" />
            <span>
              <strong>System healthy</strong>
              <small>Connected to operations API</small>
            </span>
          </div>
          <div className="user-chip">
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role.toLowerCase().replace("_", " ")}</small>
            </span>
            <button type="button" aria-label="Sign out" onClick={onLogout}>
              ↗
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {selectedGarage?.name || "GARAGE WORKSPACE"}
            </p>
            <h1>{titles[page][0]}</h1>
            <p className="topbar-subtitle">{titles[page][1]}</p>
          </div>
          <div className="topbar-actions">
            <span className="live-pill">
              <i className="signal-dot green" /> Live
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={onRefresh}
              aria-label="Refresh data"
            >
              ↻
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
