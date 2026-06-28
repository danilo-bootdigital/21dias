"use client";

import { useId, useRef, useState, type ComponentProps, type ReactNode } from "react";

/**
 * Campos de formulário do Design System (ver docs/DESIGN-SYSTEM.md).
 * Mobile-first: altura ≥48px, font-size 16px (evita zoom iOS), label sempre visível,
 * estados default/focus/error/success/disabled. Sem lógica de negócio.
 */

type FieldState = "default" | "error" | "success" | "disabled";

const STATE_BORDER: Record<FieldState, string> = {
  default: "border-border focus-within:border-gold",
  error: "border-danger",
  success: "border-success",
  disabled: "border-border opacity-60",
};

const inputBase =
  "min-h-tap w-full rounded-xl border bg-ground px-3.5 text-base text-text outline-none " +
  "transition-colors duration-fast ease-standard placeholder:text-subtle";

function Field({
  label,
  htmlFor,
  hint,
  state = "default",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  state?: FieldState;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted">
        {label}
      </label>
      {children}
      {hint ? (
        <p
          className={
            state === "error"
              ? "text-xs text-danger"
              : state === "success"
                ? "text-xs text-success"
                : "text-xs text-subtle"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  state = "default",
  ...rest
}: { label: string; hint?: string; state?: FieldState } & ComponentProps<"input">) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} state={state}>
      <div className={`flex rounded-xl border ${STATE_BORDER[state]}`}>
        <input
          id={id}
          className={`${inputBase} border-0 bg-transparent`}
          disabled={state === "disabled"}
          aria-invalid={state === "error" || undefined}
          {...rest}
        />
      </div>
    </Field>
  );
}

export function PasswordInput({
  label = "Senha",
  hint,
  state = "default",
  ...rest
}: { label?: string; hint?: string; state?: FieldState } & ComponentProps<"input">) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={id} hint={hint} state={state}>
      <div className={`flex items-center rounded-xl border pr-2 ${STATE_BORDER[state]}`}>
        <input
          id={id}
          type={show ? "text" : "password"}
          className={`${inputBase} border-0 bg-transparent`}
          disabled={state === "disabled"}
          aria-invalid={state === "error" || undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="min-h-tap shrink-0 px-2 text-sm text-subtle transition-colors duration-fast hover:text-gold"
          aria-label={show ? "Ocultar senha" : "Revelar senha"}
        >
          {show ? "Ocultar" : "Revelar"}
        </button>
      </div>
    </Field>
  );
}

export function SearchInput({
  label = "Buscar",
  placeholder = "Buscar…",
  ...rest
}: { label?: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5" role="search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative flex items-center rounded-xl border border-border focus-within:border-gold">
        <svg
          className="pointer-events-none absolute left-3.5 text-subtle"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input id={id} className={`${inputBase} border-0 bg-transparent pl-10`} placeholder={placeholder} {...rest} />
      </div>
    </div>
  );
}

export function Textarea({
  label,
  hint,
  state = "default",
  rows = 3,
  ...rest
}: { label: string; hint?: string; state?: FieldState } & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} state={state}>
      <div className={`rounded-xl border ${STATE_BORDER[state]}`}>
        <textarea
          id={id}
          rows={rows}
          className="w-full resize-none rounded-xl border-0 bg-transparent px-3.5 py-3 text-base text-text outline-none placeholder:text-subtle"
          disabled={state === "disabled"}
          {...rest}
        />
      </div>
    </Field>
  );
}

export function Select({
  label,
  hint,
  state = "default",
  children,
  ...rest
}: { label: string; hint?: string; state?: FieldState } & ComponentProps<"select">) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} state={state}>
      <div className={`flex rounded-xl border ${STATE_BORDER[state]}`}>
        <select
          id={id}
          className={`${inputBase} appearance-none border-0 bg-transparent`}
          disabled={state === "disabled"}
          {...rest}
        >
          {children}
        </select>
      </div>
    </Field>
  );
}

export function DateInput({
  label = "Data",
  hint,
  state = "default",
  ...rest
}: { label?: string; hint?: string; state?: FieldState } & ComponentProps<"input">) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} state={state}>
      <div className={`flex rounded-xl border ${STATE_BORDER[state]}`}>
        <input
          id={id}
          type="date"
          className={`${inputBase} border-0 bg-transparent [color-scheme:dark]`}
          disabled={state === "disabled"}
          {...rest}
        />
      </div>
    </Field>
  );
}

/** OTP — código de N dígitos com auto-avanço (sem lógica de verificação). */
export function OTPInput({
  label = "Código",
  length = 6,
  state = "default",
}: {
  label?: string;
  length?: number;
  state?: FieldState;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const border =
    state === "error" ? "border-danger" : state === "success" ? "border-success" : "border-border focus:border-gold";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex gap-2" role="group" aria-label={label}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Dígito ${i + 1}`}
            className={`size-12 rounded-xl border bg-ground text-center text-lg font-semibold text-text outline-none transition-colors duration-fast ${border}`}
            onChange={(e) => {
              if (e.target.value && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !e.currentTarget.value && i > 0) refs.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
    </div>
  );
}
