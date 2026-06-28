"use client";

import { useEffect, useState } from "react";

/**
 * Progress Bar e Ring (ver DESIGN-SYSTEM.md / MOTION-LANGUAGE.md).
 * Preenchem firme em `slow` `standard` (nunca quica). Animam de 0 até `value`
 * na montagem e sempre que `value`/`playKey` mudam. `value` em 0–100.
 */

function useAnimatedValue(value: number, playKey: unknown) {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(0);
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, playKey]);
  return v;
}

export function ProgressBar({
  value,
  label,
  playKey,
}: {
  value: number;
  label?: string;
  playKey?: unknown;
}) {
  const v = useAnimatedValue(value, playKey);
  return (
    <div>
      <div
        className="h-3 overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-strong to-gold-bright transition-[width] duration-slow ease-standard motion-reduce:transition-none"
          style={{ width: `${v}%` }}
        />
      </div>
      {label ? <p className="mt-1.5 text-xs text-subtle">{label}</p> : null}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 112,
  stroke = 9,
  center,
  playKey,
}: {
  value: number;
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
  playKey?: unknown;
}) {
  const v = useAnimatedValue(value, playKey);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E1C18" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#C8A45D"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-slow ease-standard motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-xl font-extrabold tabular-nums">
        {center ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}
