"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { sair } from "@/lib/auth/actions";
import { AreaSwitch } from "@/components/ui/area-switch";
import { BottomSheet } from "@/components/ui/overlays";

/**
 * Admin Shell mobile-first (Sprint 1). Apenas o container/navegação onde as
 * telas administrativas existentes são exibidas — nenhuma tela é redesenhada,
 * nenhuma regra de negócio é tocada. Header com botão Menu → Bottom Sheet
 * (Design System), sem barra horizontal e sem bottom navigation no admin.
 * "Área do Guerreiro" reusa o componente AreaSwitch atual (sem novo padrão).
 */

// Menu operacional. "Auditoria de Acessos" (/admin/entitlements) fica fora —
// continua existindo como rota técnica.
const NAV: [string, string][] = [
  ["/admin", "Dashboard"],
  ["/admin/guerreiros", "Guerreiros"],
  ["/admin/turmas", "Turmas"],
  ["/admin/programas", "Programas"],
  ["/admin/matriculas", "Matrículas"],
  ["/admin/acesso", "Conceder Acesso"],
];

const Icon = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  const mostrarVoltar = pathname !== "/admin";
  const ativo = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-[100dvh]">
      {/* Header mobile — voltar (quando necessário) + marca + botão Menu */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-ground/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-1.5">
          {mostrarVoltar ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Voltar"
              className="grid size-11 place-items-center rounded-lg text-muted transition-colors duration-fast ease-standard hover:text-gold"
            >
              <Icon d="M15 18l-6-6 6-6" />
            </button>
          ) : null}
          <div className="leading-tight">
            <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-gold">
              Código 21
            </p>
            <p className="text-xs text-subtle">Admin</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-haspopup="dialog"
          aria-expanded={menu}
          className="inline-flex min-h-tap items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-text transition-colors duration-fast ease-standard hover:border-gold"
        >
          <Icon d="M4 7h16M4 12h16M4 17h16" size={20} />
          Menu
        </button>
      </header>

      {/* Conteúdo — as telas existentes vivem aqui, inalteradas */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-6">
        {children}
      </main>

      {/* Menu — Bottom Sheet (~85% da altura), nunca drawer/sidebar */}
      <BottomSheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <div className="flex h-[80dvh] flex-col">
          <nav aria-label="Navegação administrativa" className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {NAV.map(([href, label]) => {
              const on = ativo(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenu(false)}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-tap items-center justify-between rounded-xl px-4 text-base transition-colors duration-fast ease-standard ${
                    on ? "bg-gold/10 font-semibold text-gold" : "text-text hover:bg-surface"
                  }`}
                >
                  {label}
                  <Icon d="M9 6l6 6-6 6" size={18} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-4">
            {/* Mesmo componente visual usado hoje para alternar áreas */}
            <AreaSwitch
              href="/dashboard"
              className="flex min-h-tap w-full items-center justify-center"
            >
              Área do Guerreiro
            </AreaSwitch>
            <form action={sair}>
              <button
                type="submit"
                className="min-h-tap w-full rounded-xl text-base text-subtle transition-colors duration-fast ease-standard hover:text-gold"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
