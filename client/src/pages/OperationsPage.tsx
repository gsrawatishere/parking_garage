import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, Garage, Spot, Ticket } from "../lib/api";
import { Field, SelectField } from "../components/FormControls";
import { EmptyState, Feedback } from "../components/Feedback";
import { FormValues } from "../types/app";
import { time } from "../utils/format";

export function OperationsPage({
  garage,
  onRefresh,
}: {
  garage?: Garage;
  onRefresh: () => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [availability, setAvailability] = useState<
    Record<string, Record<string, number>>
  >({});
  const [mode, setMode] = useState<"in" | "out">("in");
  const [values, setValues] = useState<FormValues>({
    plateNumber: "",
    vehicleType: "STANDARD",
    spotId: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!garage) return;
    const [ticketResult, availabilityResult, spotResult] = await Promise.all([
      api.tickets(garage.id),
      api.availability(garage.id),
      api.spots(garage.id),
    ]);
    setTickets(ticketResult.tickets);
    setAvailability(availabilityResult.availability);
    setSpots(spotResult.spots.filter((spot) => spot.status === "AVAILABLE"));
  };
  useEffect(() => {
    void load().catch(() => undefined);
  }, [garage]);
  const change = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!garage) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "in")
        await api.checkIn({
          garageId: garage.id,
          plateNumber: values.plateNumber,
          vehicleType: values.vehicleType,
          ...(values.spotId ? { spotId: values.spotId } : {}),
        });
      else await api.checkOut({ plateNumber: values.plateNumber });
      setMessage(
        mode === "in"
          ? "Vehicle checked in and bay assigned."
          : "Vehicle checked out and payment recorded.",
      );
      setValues({ plateNumber: "", vehicleType: "STANDARD", spotId: "" });
      await load();
      onRefresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <div className="operations-layout">
        <section className="panel action-panel">
          <div className="segmented">
            <button
              type="button"
              className={mode === "in" ? "selected" : ""}
              onClick={() => setMode("in")}
            >
              Check in
            </button>
            <button
              type="button"
              className={mode === "out" ? "selected" : ""}
              onClick={() => setMode("out")}
            >
              Check out
            </button>
          </div>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {mode === "in" ? "NEW SESSION" : "CLOSE SESSION"}
              </span>
              <h3>{mode === "in" ? "Park a vehicle" : "Release a vehicle"}</h3>
            </div>
            <span className="operator-badge">Operator mode</span>
          </div>
          <form onSubmit={submit} className="stack-form">
            <Field
              label="License plate"
              name="plateNumber"
              value={values.plateNumber}
              onChange={change}
              placeholder="8ABC123"
            />
            {mode === "in" && (
              <>
                <SelectField
                  label="Vehicle type"
                  name="vehicleType"
                  value={values.vehicleType}
                  onChange={change}
                  options={["COMPACT", "STANDARD", "EV"]}
                />
                <SelectField
                  label="Preferred bay"
                  name="spotId"
                  value={values.spotId}
                  onChange={change}
                  options={[
                    { value: "", label: "Auto-assign best available" },
                    ...spots
                      .filter((spot) => spot.type === values.vehicleType)
                      .map((spot) => ({
                        value: spot.id,
                        label: `${spot.spotNumber} · ${spot.type}`,
                      })),
                  ]}
                />
              </>
            )}
            {message && (
              <Feedback
                message={message}
                error={
                  message.includes("failed") ||
                  message.includes("not found") ||
                  message.includes("available")
                }
              />
            )}
            <button type="submit" className="primary-button" disabled={busy}>
              {busy
                ? "Processing…"
                : mode === "in"
                  ? "Assign bay & check in"
                  : "Calculate & check out"}
              <span>→</span>
            </button>
          </form>
        </section>
        <section className="panel availability-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LIVE CAPACITY</span>
              <h3>{garage?.name || "Select a garage"}</h3>
            </div>
            <span className="live-pill">
              <i className="signal-dot green" /> Live
            </span>
          </div>
          <div className="availability-cards">
            {["COMPACT", "STANDARD", "EV"].map((type) => (
              <div key={type} className="availability-card">
                <span className={`vehicle-symbol ${type.toLowerCase()}`}>
                  {type === "EV" ? "⚡" : "▰"}
                </span>
                <strong>{availability[type]?.AVAILABLE || 0}</strong>
                <span>{type} available</span>
              </div>
            ))}
          </div>
          <div className="availability-foot">
            <span>Occupancy</span>
            <strong>
              {Object.values(availability).reduce(
                (sum, item) => sum + (item.OCCUPIED || 0),
                0,
              )}{" "}
              occupied
            </strong>
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">ACTIVE SESSIONS</span>
            <h3>Vehicles inside now</h3>
          </div>
          <span className="count-badge">{tickets.length} active</span>
        </div>
        {tickets.length ? (
          <div className="data-table">
            <div className="table-row table-head">
              <span>Vehicle</span>
              <span>Bay</span>
              <span>Arrived</span>
              <span>Type</span>
              <span />
            </div>
            {tickets.map((ticket) => (
              <div className="table-row" key={ticket.id}>
                <span className="vehicle-cell">
                  <span className="plate-tag">
                    {ticket.vehicle.plateNumber}
                  </span>
                  <strong>{ticket.vehicle.vehicleType}</strong>
                </span>
                <span>{ticket.spot.spotNumber}</span>
                <span>{time(ticket.checkedInAt)}</span>
                <span>
                  <i className="status-dot active" /> Active
                </span>
                <button
                  type="button"
                  className="table-action"
                  onClick={() => {
                    setMode("out");
                    setValues((current) => ({
                      ...current,
                      plateNumber: ticket.vehicle.plateNumber,
                    }));
                  }}
                >
                  Check out →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active sessions"
            detail="Checked-in vehicles will appear here in real time."
          />
        )}
      </section>
    </div>
  );
}
