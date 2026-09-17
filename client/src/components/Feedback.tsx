import { ReactNode } from "react";

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark">+</div>
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  );
}

export function Feedback({
  message,
  error = false,
}: {
  message?: string;
  error?: boolean;
}) {
  if (!message) return null;
  return <div className={error ? "form-error" : "form-success"}>{message}</div>;
}
