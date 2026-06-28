import type { ReactNode } from "react";

/**
 * Alertas inline e Banner (ver DESIGN-SYSTEM.md). Persistentes (não efêmeros —
 * para efêmero use Toast/Snackbar). Presentational.
 */

type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

export function Alert({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-3 text-sm ${TONES[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

export function Banner({
  children,
  action,
  dot = true,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <div
      role="region"
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-3.5 py-3 text-sm text-muted ${className}`}
    >
      {dot ? <span className="size-2 shrink-0 rounded-full bg-warning" /> : null}
      <span className="flex-1">{children}</span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  );
}
