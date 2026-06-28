"use client";

import type { ComponentProps, ReactNode } from "react";

/**
 * FAB — uma ação primária recorrente que flutua acima da Bottom Nav.
 * Ver DESIGN-SYSTEM.md: nunca >1 por tela; sempre com label acessível.
 */
export function FAB({
  label,
  icon,
  className = "",
  ...rest
}: { label: string; icon?: ReactNode } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-5 z-[45] grid size-14 place-items-center rounded-full bg-gold text-ground shadow-pop transition-transform duration-fast ease-standard active:scale-95 ${className}`}
      {...rest}
    >
      {icon ?? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </button>
  );
}
