"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Navegação principal do Guerreiro — barra inferior fixa (zona do polegar).
 * Mobile-first: 5 destinos, alvos ≥48px, respeita a área segura do iOS.
 * Consolidação (ver docs/CONSTITUICAO-EXPERIENCIA-GUERREIRO.md):
 *   Missão vive dentro de "Hoje"; Certificado e Hall vivem no "Legado" (Perfil).
 */

type Tab = { href: string; label: string; icon: ReactNode };

const I = (paths: ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const TABS: Tab[] = [
  { href: "/dashboard", label: "Hoje", icon: I(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>) },
  { href: "/protocolo", label: "Jornada", icon: I(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>) },
  { href: "/ranking", label: "Ranking", icon: I(<><path d="M6 4h12v4a6 6 0 0 1-12 0V4z" /><path d="M12 14v4M8 21h8M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" /></>) },
  { href: "/feed", label: "Feed", icon: I(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5.2" /></>) },
  { href: "/perfil", label: "Perfil", icon: I(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>) },
];

export function BottomNav({ activeOverride }: { activeOverride?: string }) {
  const pathname = usePathname();
  const current = activeOverride ?? pathname;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ground/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch justify-around">
        {TABS.map((t) => {
          const active = current === t.href || current.startsWith(t.href + "/");
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-tap flex-col items-center justify-center gap-1 py-2 text-[0.68rem] font-medium transition ${
                  active ? "text-gold" : "text-subtle hover:text-muted"
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
