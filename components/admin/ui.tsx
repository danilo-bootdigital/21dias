import Link from "next/link";

const CORES: Record<string, string> = {
  ativa: "text-emerald-300 border-emerald-900/60 bg-emerald-950/40",
  concluida: "text-gold border-gold/40 bg-gold/10",
  cancelada: "text-red-300 border-red-900/60 bg-red-950/40",
  ativo: "text-emerald-300 border-emerald-900/60 bg-emerald-950/40",
  reembolsado: "text-red-300 border-red-900/60 bg-red-950/40",
  agendada: "text-sky-300 border-sky-900/60 bg-sky-950/40",
  contagem: "text-sky-300 border-sky-900/60 bg-sky-950/40",
  encerrada: "text-subtle border-border bg-surface-raised",
  arquivada: "text-subtle border-border bg-surface-raised",
};

export function StatusBadge({ value }: { value?: string | null }) {
  const v = value ?? "—";
  const cls = CORES[v] ?? "text-muted border-border bg-surface-raised";
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`}>{v}</span>;
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}

export function Aviso({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <p
      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
        erro
          ? "border-red-900/50 bg-red-950/40 text-red-300"
          : "border-gold/40 bg-gold/10 text-gold"
      }`}
    >
      {decodeURIComponent(erro || ok || "")}
    </p>
  );
}

export function LinkBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
    >
      {children}
    </Link>
  );
}

export const td = "border-b border-border px-3 py-2 text-sm";
export const th =
  "border-b border-border px-3 py-2 text-left text-xs uppercase tracking-wider text-subtle";
