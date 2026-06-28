"use client";

import { useState } from "react";
import { formCancelar, formReativar, formTransferir } from "@/lib/admin/forms";
import { StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/primitives";
import { Select } from "@/components/ui/fields";
import { BottomSheet, Dialog } from "@/components/ui/overlays";

/**
 * Card de matrícula com gestão em Bottom Sheet (admin mobile, Sprint 5).
 * Toda autorização e lógica continuam nas server actions existentes
 * (formCancelar/formReativar/formTransferir) — aqui só UI/navegação.
 * Campos preservados: matriculaId, novaTurmaId, back.
 */

const BACK = "/admin/matriculas";
type Destino = { id: string; codigo: string };

const Chevron = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-subtle">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function MatriculaCard({
  id,
  status,
  nome,
  email,
  programa,
  turma,
  joinedAt,
  destinos,
}: {
  id: string;
  status: string;
  nome: string;
  email: string;
  programa: string;
  turma: string;
  joinedAt: string;
  destinos: Destino[];
}) {
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="block w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors duration-fast ease-standard hover:border-gold"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="truncate font-medium text-text">{nome}</p>
          <div className="flex items-center gap-2">
            <StatusBadge value={status} />
            <Chevron />
          </div>
        </div>
        <p className="break-all text-sm text-muted">{email}</p>
        <p className="mt-1 text-sm text-subtle">
          {programa} · {turma}
          {joinedAt ? ` · entrou ${joinedAt}` : ""}
        </p>
      </button>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title={nome}>
        <p className="mb-3 text-sm text-subtle">
          {programa} · {turma} · <StatusBadge value={status} />
        </p>
        <div className="flex flex-col gap-3">
          {status === "ativa" ? (
            <>
              {destinos.length ? (
                <form
                  action={formTransferir}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3"
                >
                  <input type="hidden" name="matriculaId" value={id} />
                  <input type="hidden" name="back" value={BACK} />
                  <Select label="Transferir para a turma" name="novaTurmaId" defaultValue={destinos[0].id}>
                    {destinos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" variante="secondary">
                    Transferir
                  </Button>
                </form>
              ) : (
                <p className="rounded-xl border border-border px-3 py-3 text-sm text-subtle">
                  Sem outra turma no mesmo programa para transferir.
                </p>
              )}
              <Button
                variante="danger"
                onClick={() => {
                  setSheet(false);
                  setDialog(true);
                }}
              >
                Cancelar matrícula
              </Button>
            </>
          ) : null}

          {status === "cancelada" ? (
            <form action={formReativar}>
              <input type="hidden" name="matriculaId" value={id} />
              <input type="hidden" name="back" value={BACK} />
              <Button type="submit" variante="success">
                Reativar matrícula
              </Button>
            </form>
          ) : null}

          {status === "concluida" ? (
            <p className="rounded-xl border border-border px-3 py-3 text-sm text-subtle">
              Matrícula concluída — sem ações disponíveis.
            </p>
          ) : null}

          <Button variante="ghost" onClick={() => setSheet(false)}>
            Fechar
          </Button>
        </div>
      </BottomSheet>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Cancelar matrícula?">
        <p className="mb-5 text-sm text-muted">
          Isso revoga o acesso do guerreiro a esta turma. Você pode reativar depois, se precisar.
        </p>
        <div className="flex flex-col gap-3">
          <form action={formCancelar}>
            <input type="hidden" name="matriculaId" value={id} />
            <input type="hidden" name="back" value={BACK} />
            <Button type="submit" variante="danger">
              Cancelar matrícula
            </Button>
          </form>
          <Button variante="ghost" onClick={() => setDialog(false)}>
            Voltar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
