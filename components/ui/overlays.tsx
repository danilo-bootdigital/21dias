"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Bottom Sheet (prioridade) e Dialog (ver DESIGN-SYSTEM.md).
 * Sheet = ação/conteúdo contextual subindo da base. Dialog = decisão crítica.
 * Scrim, Esc, foco inicial e retorno de foco ao gatilho. Mobile-first.
 */

function useOverlay(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLDivElement | null>) {
  const prevFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("[autofocus],button,[href],input,select,textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open, onClose, panelRef]);
}

function Scrim({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      aria-hidden="true"
      onClick={onClose}
      className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-base ease-standard ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      } motion-reduce:transition-none`}
    />
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose, ref);
  return (
    <>
      <Scrim open={open} onClose={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-screen-sm rounded-t-2xl border-t border-border bg-surface-raised px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 shadow-overlay transition-transform duration-base ease-standard ${
          open ? "translate-y-0" : "translate-y-full"
        } motion-reduce:transition-none`}
      >
        <div className="mx-auto mb-3.5 mt-1.5 h-1 w-10 rounded-full bg-border" />
        <p className="h-card mb-3">{title}</p>
        {children}
      </div>
    </>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose, ref);
  return (
    <>
      <Scrim open={open} onClose={onClose} />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed left-1/2 top-1/2 z-50 w-[min(360px,86vw)] -translate-x-1/2 rounded-2xl border border-border bg-surface-raised p-6 shadow-overlay transition-all duration-base ease-standard ${
          open ? "-translate-y-1/2 scale-100 opacity-100" : "pointer-events-none -translate-y-[46%] scale-[0.98] opacity-0"
        } motion-reduce:transition-none`}
      >
        <p className="h-card">{title}</p>
        <div className="mt-2">{children}</div>
      </div>
    </>
  );
}
