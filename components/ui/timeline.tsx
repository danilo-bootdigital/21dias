import type { ReactNode } from "react";

/**
 * Timeline da Jornada (ver DESIGN-SYSTEM.md). Vertical, mobile-first.
 * Estado por nó: bloqueado · hoje · concluído · perdido (digno, sem punição).
 * Presentational — sem dados reais.
 */

type Estado = "bloqueado" | "hoje" | "concluido" | "perdido";

const NODE: Record<Estado, { icon: string; ring: string; body: string }> = {
  bloqueado: { icon: "🔒", ring: "border-border text-subtle", body: "border-border opacity-60" },
  hoje: { icon: "▶", ring: "border-gold text-gold-bright", body: "border-gold/40" },
  concluido: { icon: "✓", ring: "border-success/60 text-success", body: "border-border" },
  perdido: { icon: "!", ring: "border-danger/60 text-danger", body: "border-border" },
};

export type TimelineItem = { titulo: ReactNode; estado: Estado };

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative pl-9">
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gradient-to-b from-gold to-gold/15"
      />
      {items.map((it, i) => {
        const n = NODE[it.estado];
        return (
          <li key={i} className="relative mb-2.5">
            <span
              className={`absolute -left-9 top-0 grid size-6 place-items-center rounded-full border bg-surface-raised text-xs shadow-[0_0_0_4px_var(--ground)] ${n.ring}`}
            >
              {n.icon}
            </span>
            <div className={`rounded-xl border bg-surface px-3 py-2.5 text-sm ${n.body}`}>{it.titulo}</div>
          </li>
        );
      })}
    </ol>
  );
}
