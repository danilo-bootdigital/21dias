import type { ReactNode } from "react";

/**
 * Medalha — símbolo de conquista (ver DESIGN-SYSTEM.md / MOTION-LANGUAGE.md).
 * Presentational. A animação cerimonial de "conquista" é disparada por quem
 * usa (classe `animate-…`/Web Animations), nunca em loop.
 */

export type MedalTier = "bronze" | "prata" | "ouro";
type Size = "sm" | "md" | "lg";

const GRAD: Record<MedalTier, string> = {
  bronze: "radial-gradient(circle at 50% 35%, #D8A06A, #9B6B3F)",
  prata: "radial-gradient(circle at 50% 35%, #E2E2E2, #9A9A9A)",
  ouro: "radial-gradient(circle at 50% 35%, #E4C77E, #B89146)",
};

const SIZE: Record<Size, string> = {
  sm: "size-9 text-base",
  md: "size-16 text-2xl",
  lg: "size-24 text-4xl",
};

export function Medal({
  tier = "ouro",
  size = "md",
  locked = false,
  glow = false,
  icon = "🏅",
  className = "",
  ariaLabel,
}: {
  tier?: MedalTier;
  size?: Size;
  locked?: boolean;
  glow?: boolean;
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const label = ariaLabel ?? (locked ? "Medalha bloqueada" : `Medalha ${tier}`);
  if (locked) {
    return (
      <span
        role="img"
        aria-label={label}
        className={`grid place-items-center rounded-full border border-dashed border-border bg-surface-raised text-subtle ${SIZE[size]} ${className}`}
      >
        🔒
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`grid place-items-center rounded-full text-ground ${SIZE[size]} ${glow ? "shadow-glow-gold" : ""} ${className}`}
      style={{ backgroundImage: GRAD[tier] }}
    >
      {icon}
    </span>
  );
}
