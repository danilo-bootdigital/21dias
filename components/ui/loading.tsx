/**
 * Skeleton e Loading (ver DESIGN-SYSTEM.md / MOTION-LANGUAGE.md).
 * Skeleton quando o layout é previsível; Spinner para espera sem layout.
 * Shimmer respeita prefers-reduced-motion (token `animate-shimmer`).
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-3.5 rounded-lg bg-[linear-gradient(90deg,#1E1C18,#2A2722_50%,#1E1C18)] bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5" aria-busy="true">
      <Skeleton className="w-2/5" />
      <Skeleton />
      <Skeleton className="w-4/5" />
    </div>
  );
}

export function Spinner({
  size = 18,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-muted ${className}`}>
      <span
        aria-hidden="true"
        className="inline-block animate-spin rounded-full border-2 border-gold border-r-transparent"
        style={{ width: size, height: size }}
      />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Carregando</span>}
    </span>
  );
}
