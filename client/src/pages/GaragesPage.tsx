import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, Garage } from "../lib/api";
import { Field, SelectField } from "../components/FormControls";
import { EmptyState, Feedback } from "../components/Feedback";
import { Floor, FormValues, RatePolicy } from "../types/app";
import { money } from "../utils/format";

export function GaragesPage({
  garages,
  onRefresh,
}: {
  garages: Garage[];
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Garage>();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rates, setRates] = useState<RatePolicy[]>([]);
  const [showGarage, setShowGarage] = useState(!garages.length);
  const [showFloor, setShowFloor] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [showSpot, setShowSpot] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [garageValues, setGarageValues] = useState<FormValues>({
    name: "",
    address: "",
    timezone: "UTC",
  });
  const [floorValues, setFloorValues] = useState<FormValues>({
    name: "",
    level: "1",
  });
  const [rateValues, setRateValues] = useState<FormValues>({
    name: "",
    firstHourRate: "5",
    additionalHourRate: "3",
    dailyCap: "30",
    currency: "USD",
  });
  const [spotValues, setSpotValues] = useState<FormValues>({
    floorId: "",
    spotNumber: "",
    type: "STANDARD",
  });
  useEffect(
    () =>
      setSelected(
        (current) =>
          garages.find((garage) => garage.id === current?.id) || garages[0],
      ),
    [garages],
  );
  useEffect(() => {
    if (!selected) return;
    void Promise.all([api.floors(selected.id), api.ratePolicies(selected.id)])
      .then(([floorResult, rateResult]) => {
        setFloors(floorResult.floors);
        setRates(rateResult.policies);
      })
      .catch(() => undefined);
  }, [selected]);
  const update =
    (setter: (updater: (current: FormValues) => FormValues) => void) =>
    (name: string, value: string) =>
      setter((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createGarage(garageValues);
      setShowGarage(false);
      setGarageValues({ name: "", address: "", timezone: "UTC" });
      onRefresh();
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Unable to create garage.",
      );
    } finally {
      setBusy(false);
    }
  };
  const createFloor = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await api.createFloor(selected.id, {
        name: floorValues.name,
        level: Number(floorValues.level),
      });
      setShowFloor(false);
      const result = await api.floors(selected.id);
      setFloors(result.floors);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Unable to create floor.",
      );
    } finally {
      setBusy(false);
    }
  };
  const createRate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await api.createRatePolicy(selected.id, {
        ...rateValues,
        firstHourRate: Number(rateValues.firstHourRate),
        additionalHourRate: Number(rateValues.additionalHourRate),
        dailyCap: Number(rateValues.dailyCap),
      });
      setShowRate(false);
      const result = await api.ratePolicies(selected.id);
      setRates(result.policies);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Unable to create rate policy.",
      );
    } finally {
      setBusy(false);
    }
  };
  const createSpot = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await api.createSpot(selected.id, { ...spotValues });
      setShowSpot(false);
      const result = await api.floors(selected.id);
      setFloors(result.floors);
    } catch (err) {
      setMessage(
        err instanceof ApiError ? err.message : "Unable to create bay.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">CONFIGURATION</span>
          <h2>Your garages</h2>
        </div>
        <button
          type="button"
          className="primary-button compact"
          onClick={() => setShowGarage(true)}
        >
          + Add garage
        </button>
      </div>
      {showGarage && (
        <section className="panel create-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEW GARAGE</span>
              <h3>Set up a location</h3>
            </div>
            <button
              type="button"
              className="close-button"
              onClick={() => setShowGarage(false)}
            >
              ×
            </button>
          </div>
          <form onSubmit={submit} className="form-grid">
            <Field
              label="Garage name"
              name="name"
              value={garageValues.name}
              onChange={update(setGarageValues)}
              placeholder="Central Market Garage"
            />
            <Field
              label="Address"
              name="address"
              value={garageValues.address}
              onChange={update(setGarageValues)}
              placeholder="100 Main Street"
            />
            <SelectField
              label="Timezone"
              name="timezone"
              value={garageValues.timezone}
              onChange={update(setGarageValues)}
              options={[
                "UTC",
                "America/New_York",
                "America/Los_Angeles",
                "Europe/London",
              ]}
            />
            <button
              type="submit"
              className="primary-button compact"
              disabled={busy}
            >
              Create garage <span>→</span>
            </button>
          </form>
          <Feedback message={message} error />
        </section>
      )}
      <div className="garage-layout">
        <section className="garage-list">
          {garages.map((garage) => (
            <button
              type="button"
              className={
                selected?.id === garage.id
                  ? "garage-list-item selected"
                  : "garage-list-item"
              }
              key={garage.id}
              onClick={() => setSelected(garage)}
            >
              <span className="garage-avatar">{garage.name.slice(0, 1)}</span>
              <span>
                <strong>{garage.name}</strong>
                <small>{garage.address}</small>
              </span>
              <b>→</b>
            </button>
          ))}
          {!garages.length && (
            <EmptyState
              title="No garages yet"
              detail="Create a location to start adding floors and bays."
            />
          )}
        </section>
        {selected && (
          <section className="panel setup-detail">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">LOCATION DETAILS</span>
                <h3>{selected.name}</h3>
                <p className="muted">{selected.address}</p>
              </div>
              <span className="status-pill success">Active</span>
            </div>
            <div className="setup-section">
              <div className="setup-heading">
                <div>
                  <strong>Floors & bays</strong>
                  <small>Organize the physical layout</small>
                </div>
                <div className="setup-actions">
                  <button
                    type="button"
                    className="text-button small"
                    onClick={() => setShowFloor(!showFloor)}
                  >
                    + Add floor
                  </button>
                  <button
                    type="button"
                    className="text-button small"
                    onClick={() => setShowSpot(!showSpot)}
                  >
                    + Add bay
                  </button>
                </div>
              </div>
              {showFloor && (
                <form onSubmit={createFloor} className="inline-form">
                  <Field
                    label="Floor name"
                    name="name"
                    value={floorValues.name}
                    onChange={update(setFloorValues)}
                    placeholder="Level 1"
                  />
                  <Field
                    label="Level"
                    name="level"
                    value={floorValues.level}
                    onChange={update(setFloorValues)}
                    type="number"
                    placeholder="1"
                  />
                  <button type="submit" className="primary-button compact">
                    Save floor <span>→</span>
                  </button>
                </form>
              )}
              {showSpot && (
                <form onSubmit={createSpot} className="inline-form">
                  <SelectField
                    label="Floor"
                    name="floorId"
                    value={spotValues.floorId || floors[0]?.id || ""}
                    onChange={update(setSpotValues)}
                    options={floors.map((floor) => ({
                      value: floor.id,
                      label: `${floor.name} · level ${floor.level}`,
                    }))}
                  />
                  <Field
                    label="Bay number"
                    name="spotNumber"
                    value={spotValues.spotNumber}
                    onChange={update(setSpotValues)}
                    placeholder="A-101"
                  />
                  <SelectField
                    label="Vehicle type"
                    name="type"
                    value={spotValues.type}
                    onChange={update(setSpotValues)}
                    options={["COMPACT", "STANDARD", "EV"]}
                  />
                  <button type="submit" className="primary-button compact">
                    Save bay <span>→</span>
                  </button>
                </form>
              )}
              {floors.length ? (
                floors.map((floor) => (
                  <div className="setup-row" key={floor.id}>
                    <span className="floor-number">{floor.level}</span>
                    <span>
                      <strong>{floor.name}</strong>
                      <small>{floor._count.spots} bays mapped</small>
                    </span>
                    <span className="row-arrow">→</span>
                  </div>
                ))
              ) : (
                <p className="muted empty-inline">No floors configured yet.</p>
              )}
            </div>
            <div className="setup-section">
              <div className="setup-heading">
                <div>
                  <strong>Rate policies</strong>
                  <small>What guests pay by the hour</small>
                </div>
                <button
                  type="button"
                  className="text-button small"
                  onClick={() => setShowRate(!showRate)}
                >
                  + Add rate
                </button>
              </div>
              {showRate && (
                <form onSubmit={createRate} className="inline-form">
                  <Field
                    label="Policy name"
                    name="name"
                    value={rateValues.name}
                    onChange={update(setRateValues)}
                    placeholder="Standard hourly"
                  />
                  <Field
                    label="First hour"
                    name="firstHourRate"
                    value={rateValues.firstHourRate}
                    onChange={update(setRateValues)}
                    type="number"
                    placeholder="5"
                  />
                  <Field
                    label="Daily cap"
                    name="dailyCap"
                    value={rateValues.dailyCap}
                    onChange={update(setRateValues)}
                    type="number"
                    placeholder="30"
                  />
                  <button type="submit" className="primary-button compact">
                    Save rate <span>→</span>
                  </button>
                </form>
              )}
              {rates.length ? (
                rates.map((rate) => (
                  <div className="setup-row" key={rate.id}>
                    <span className="rate-symbol">$</span>
                    <span>
                      <strong>{rate.name}</strong>
                      <small>
                        {money(rate.firstHourRate, rate.currency)} first hour ·{" "}
                        {money(rate.dailyCap, rate.currency)} daily cap
                      </small>
                    </span>
                    <span
                      className={
                        rate.isActive ? "status-pill success" : "status-pill"
                      }
                    >
                      {rate.isActive ? "Live" : "Off"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted empty-inline">
                  No pricing policy configured yet.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
