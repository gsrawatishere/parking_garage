import { FormEvent, useState } from "react";
import { api, ApiError, Ticket } from "../lib/api";
import { Field, SelectField } from "../components/FormControls";
import { Feedback } from "../components/Feedback";
import { FormValues } from "../types/app";

export function VehiclesPage() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<{
    plateNumber: string;
    vehicleType: string;
    tickets: Ticket[];
  }>();
  const [message, setMessage] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [values, setValues] = useState<FormValues>({
    plateNumber: "",
    vehicleType: "STANDARD",
    make: "",
    model: "",
  });
  const change = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      setResult((await api.vehicleStatus(plate)).vehicle);
    } catch (err) {
      setResult(undefined);
      setMessage(err instanceof ApiError ? err.message : "Lookup failed.");
    }
  };
  const register = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.registerVehicle(values);
      setMessage("Vehicle registered.");
      setShowRegister(false);
      setPlate(values.plateNumber);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Unable to register vehicle.",
      );
    }
  };
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">PLATE LOOKUP</span>
          <h2>Vehicle desk</h2>
        </div>
        <button
          type="button"
          className="primary-button compact"
          onClick={() => setShowRegister(!showRegister)}
        >
          + Register vehicle
        </button>
      </div>
      <section className="panel lookup-panel">
        <form onSubmit={lookup} className="lookup-form">
          <label className="search-field">
            <span>⌕</span>
            <input
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="Search by license plate"
            />
            <kbd>ENTER</kbd>
          </label>
          <button type="submit" className="secondary-button" disabled={!plate}>
            Find vehicle
          </button>
        </form>
        <Feedback message={message} error={!message.includes("registered")} />
        {result && (
          <div className="vehicle-result">
            <span className="plate-tag large">{result.plateNumber}</span>
            <div>
              <strong>{result.vehicleType} vehicle</strong>
              <small>
                {result.tickets.length
                  ? `Active in ${result.tickets[0].garage?.name || "garage"} · bay ${result.tickets[0].spot.spotNumber}`
                  : "No active session"}
              </small>
            </div>
            <span
              className={
                result.tickets.length
                  ? "status-pill warning"
                  : "status-pill success"
              }
            >
              {result.tickets.length ? "Parked now" : "Not parked"}
            </span>
          </div>
        )}
      </section>
      {showRegister && (
        <section className="panel create-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">VEHICLE RECORD</span>
              <h3>Register a vehicle</h3>
            </div>
          </div>
          <form onSubmit={register} className="form-grid">
            <Field
              label="License plate"
              name="plateNumber"
              value={values.plateNumber}
              onChange={change}
              placeholder="8ABC123"
            />
            <SelectField
              label="Vehicle type"
              name="vehicleType"
              value={values.vehicleType}
              onChange={change}
              options={["COMPACT", "STANDARD", "EV"]}
            />
            <Field
              label="Make"
              name="make"
              value={values.make}
              onChange={change}
              placeholder="Optional"
              required={false}
            />
            <Field
              label="Model"
              name="model"
              value={values.model}
              onChange={change}
              placeholder="Optional"
              required={false}
            />
            <button type="submit" className="primary-button compact">
              Save vehicle <span>→</span>
            </button>
          </form>
        </section>
      )}
      <section className="panel info-panel">
        <div className="info-icon">i</div>
        <div>
          <strong>Fast lookup works best at the gate</strong>
          <p>
            Use the plate search to confirm an active ticket before answering a
            guest or beginning checkout.
          </p>
        </div>
      </section>
    </div>
  );
}
