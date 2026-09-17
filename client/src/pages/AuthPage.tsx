import { FormEvent, useState } from "react";
import { api, ApiError, User } from "../lib/api";
import { Field } from "../components/FormControls";
import { FormValues } from "../types/app";

export function AuthPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [values, setValues] = useState<FormValues>({
    email: "",
    password: "",
    tenantName: "",
    tenantEmail: "",
    name: "",
    tenantId: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await api.login({
              email: values.email,
              password: values.password,
              ...(values.tenantId ? { tenantId: values.tenantId } : {}),
            })
          : await api.register(values);
      onAuthenticated(result.user);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to connect to the server.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="brand-mark large">P</div>
        <p className="eyebrow">OPERATIONS PLATFORM</p>
        <h1>Keep every bay accountable.</h1>
        <p className="auth-copy">
          A calm command centre for busy garages. Know what is occupied, what is
          owed, and what moves next.
        </p>
        <div className="signal-board">
          <span>
            <i className="signal-dot green" /> Live occupancy
          </span>
          <strong>94.2%</strong>
          <span>
            <i className="signal-dot amber" /> Today’s revenue
          </span>
          <strong>$8,640</strong>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-header">
          <div className="brand-lockup">
            <div className="brand-mark">P</div>
            <div>
              <strong>Parkline</strong>
              <span>Garage operations</span>
            </div>
          </div>
          <span className="secure-label">Secure access</span>
        </div>
        <div className="auth-form-wrap">
          <p className="eyebrow">
            {mode === "login" ? "WELCOME BACK" : "GET STARTED"}
          </p>
          <h2>
            {mode === "login"
              ? "Sign in to your garage"
              : "Open your garage workspace"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Use your operator credentials to continue."
              : "Create the first owner account for a new tenant."}
          </p>
          <form onSubmit={submit} className="stack-form">
            {mode === "register" && (
              <>
                <Field
                  label="Garage group name"
                  name="tenantName"
                  value={values.tenantName}
                  onChange={change}
                  placeholder="Downtown Garage Group"
                />
                <Field
                  label="Owner name"
                  name="name"
                  value={values.name}
                  onChange={change}
                  placeholder="Alex Morgan"
                />
                <Field
                  label="Workspace email"
                  name="tenantEmail"
                  value={values.tenantEmail}
                  onChange={change}
                  placeholder="owner@garage.com"
                  type="email"
                />
              </>
            )}
            <Field
              label="Email"
              name="email"
              value={values.email}
              onChange={change}
              placeholder="you@garage.com"
              type="email"
            />
            <Field
              label="Password"
              name="password"
              value={values.password}
              onChange={change}
              placeholder="At least 8 characters"
              type="password"
            />
            {mode === "login" && (
              <Field
                label="Tenant ID (only if needed)"
                name="tenantId"
                value={values.tenantId}
                onChange={change}
                placeholder="Optional"
                required={false}
              />
            )}
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="primary-button" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "login"
                  ? "Enter workspace"
                  : "Create workspace"}
              <span>→</span>
            </button>
          </form>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "New garage group? Create an owner account"
              : "Already have access? Sign in"}
          </button>
        </div>
        <span className="auth-footer">
          Your data is isolated by workspace and protected in transit.
        </span>
      </section>
    </main>
  );
}
