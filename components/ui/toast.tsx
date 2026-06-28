"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

/**
 * Toast (efêmero, sem ação) e Snackbar (efêmero, com 1 ação) — DESIGN-SYSTEM.md.
 * Envolva a árvore em <ToastProvider> e dispare com useToast().show(...).
 * Aparece acima da bottom nav, auto-dismiss, role status/alert.
 */

type Tone = "neutral" | "success" | "warning" | "danger";
type ToastInput = { message: string; tone?: Tone; actionLabel?: string; onAction?: () => void; duration?: number };
type ToastItem = ToastInput & { id: number };

const ToastCtx = createContext<{ show: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-border",
  success: "border-success/50",
  warning: "border-warning/50",
  danger: "border-danger/50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { ...t, id }]);
    const dur = t.duration ?? (t.actionLabel ? 5000 : 3200);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), dur);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "danger" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-screen-sm items-center gap-3 rounded-xl border bg-surface-raised px-4 py-3 text-sm shadow-pop ${TONE_BORDER[t.tone ?? "neutral"]} animate-[sheet-up_240ms_cubic-bezier(0.2,0,0,1)]`}
          >
            <span className="flex-1">{t.message}</span>
            {t.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
                className="shrink-0 font-semibold text-gold transition-colors duration-fast hover:text-gold-bright"
              >
                {t.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
