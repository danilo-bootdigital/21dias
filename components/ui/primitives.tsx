import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Primitivos base do Design System (ver docs/DESIGN-SYSTEM.md).
 * Fonte única — não duplicar estas classes nas telas.
 * Mobile-first: alvo ≥48px, full-width por padrão, dark + dourado.
 */

type Variante = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";

const BASE_BTN =
  "relative inline-flex min-h-tap items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold " +
  "transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none " +
  "disabled:pointer-events-none disabled:opacity-60";

const VARIANTES: Record<Variante, string> = {
  primary: "bg-gold text-ground hover:bg-gold-strong",
  secondary: "border border-border bg-surface text-text hover:border-gold",
  outline: "border border-gold-strong bg-transparent text-gold hover:bg-gold/10",
  ghost: "text-subtle hover:text-gold",
  danger: "border border-danger/50 bg-transparent text-danger hover:bg-danger/10",
  success: "border border-success/50 bg-transparent text-success hover:bg-success/10",
};

export function buttonClasses(variante: Variante = "primary", fullWidth = true, extra = "") {
  return `${BASE_BTN} ${VARIANTES[variante]} ${fullWidth ? "w-full" : ""} ${extra}`.trim();
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function Button({
  variante = "primary",
  fullWidth = true,
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: {
  variante?: Variante;
  fullWidth?: boolean;
  loading?: boolean;
} & ComponentProps<"button">) {
  return (
    <button
      className={buttonClasses(variante, fullWidth, className)}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variante = "primary",
  fullWidth = true,
  className = "",
  children,
}: {
  href: string;
  variante?: Variante;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variante, fullWidth, className)}>
      {children}
    </Link>
  );
}

/** Container mobile-first das telas (coluna única, gutters, safe-area). */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-screen-sm px-5 pb-[max(2rem,var(--safe-bottom))] pt-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
  raised = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  raised?: boolean;
}) {
  const base = raised
    ? "bg-surface-raised shadow-pop"
    : "bg-surface";
  return (
    <Tag className={`rounded-2xl border border-border p-5 ${base} ${className}`}>{children}</Tag>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function ScreenTitle({
  children,
  level = 1,
  className = "",
}: {
  children: ReactNode;
  level?: 1 | 2;
  className?: string;
}) {
  const cls = `${level === 1 ? "h-display" : "h-section"} ${className}`;
  return level === 1 ? <h1 className={cls}>{children}</h1> : <h2 className={cls}>{children}</h2>;
}

export function Divider({ label, className = "" }: { label?: string; className?: string }) {
  if (!label)
    return <hr className={`border-0 border-t border-line ${className}`} role="separator" />;
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs uppercase tracking-wider text-subtle">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

type BadgeTone = "gold" | "neutral";
export function Badge({
  children,
  tone = "gold",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones = tone === "gold" ? "bg-gold text-ground" : "bg-surface-raised text-muted border border-border";
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[0.66rem] font-bold ${tones} ${className}`}
    >
      {children}
    </span>
  );
}

type TagTone = "neutral" | "success" | "warning" | "danger" | "info";
export function Tag({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
}) {
  const tones: Record<TagTone, string> = {
    neutral: "border-border text-muted",
    success: "border-success/40 text-success",
    warning: "border-warning/40 text-warning",
    danger: "border-danger/40 text-danger",
    info: "border-info/40 text-info",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
