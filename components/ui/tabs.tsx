"use client";

import { useState, type ReactNode } from "react";

/**
 * Chip, Tabs e Segmented Control (ver DESIGN-SYSTEM.md).
 * Chip = filtro/seleção. Tabs = alterna conteúdo na mesma tela.
 * Segmented = 1 entre 2–4 opções exclusivas. Mobile-first, alvos ≥44px.
 */

export function Chip({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-[38px] items-center rounded-full border px-3.5 text-sm transition-colors duration-fast ease-standard ${
        selected ? "border-gold bg-gold/10 text-gold-bright" : "border-border text-muted hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

export function Tabs({
  tabs,
  initial,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  initial?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  return (
    <div role="tablist" aria-label="Abas" className="flex gap-2">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => {
              setActive(t.key);
              onChange?.(t.key);
            }}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm transition-colors duration-fast ease-standard ${
              on ? "border-gold text-gold" : "border-border text-subtle hover:text-gold"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented({
  options,
  initial,
  onChange,
}: {
  options: { key: string; label: string }[];
  initial?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(initial ?? options[0]?.key);
  return (
    <div role="radiogroup" className="flex rounded-2xl border border-border bg-surface-raised p-1">
      {options.map((o) => {
        const on = o.key === active;
        return (
          <button
            key={o.key}
            role="radio"
            aria-checked={on}
            onClick={() => {
              setActive(o.key);
              onChange?.(o.key);
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-fast ease-standard ${
              on ? "bg-gold text-ground" : "text-subtle hover:text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
