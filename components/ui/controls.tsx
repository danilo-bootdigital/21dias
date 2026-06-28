import type { ComponentProps, ReactNode } from "react";

/**
 * Checkbox e Toggle (ver DESIGN-SYSTEM.md). Controles de seleção booleana.
 * Mobile-first: linha de toque ≥44px, nativos (acessíveis), acento dourado.
 * Sem estado interno — funcionam em <form> com server actions (defaultChecked/name).
 */

export function Checkbox({
  label,
  hint,
  className = "",
  ...rest
}: { label: ReactNode; hint?: ReactNode } & ComponentProps<"input">) {
  return (
    <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 ${className}`}>
      <input
        type="checkbox"
        className="size-5 shrink-0 accent-gold"
        {...rest}
      />
      <span className="flex flex-col">
        <span className="text-sm text-text">{label}</span>
        {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Toggle({
  label,
  className = "",
  ...rest
}: { label: ReactNode } & ComponentProps<"input">) {
  return (
    <label className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 ${className}`}>
      <span className="text-sm text-text">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-surface-raised ring-1 ring-border transition-colors duration-fast ease-standard peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold-bright"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-0.5 size-5 rounded-full bg-subtle transition-transform duration-fast ease-standard peer-checked:translate-x-5 peer-checked:bg-ground"
        />
      </span>
    </label>
  );
}
