"use client";

import { useState, type ReactNode } from "react";
import {
  publicarProgramaLista,
  despublicarProgramaLista,
  duplicarPrograma,
  arquivarPrograma,
  desarquivarPrograma,
  excluirPrograma,
} from "@/lib/admin/programas";
import type { ProgramaAdmin } from "@/lib/admin/programas-data";
import { Button, ButtonLink, Tag } from "@/components/ui/primitives";
import { BottomSheet, Dialog } from "@/components/ui/overlays";
import { STATUS_LABEL } from "@/lib/admin/programa-status";

/**
 * Card de programa (admin mobile, Sprint 7). Gestão em Bottom Sheet; ações
 * destrutivas (arquivar/excluir) com Dialog de confirmação. Toda a lógica
 * permanece nas server actions existentes — aqui só UI. Campo preservado: id.
 */
type Variante = "secondary" | "outline" | "danger" | "ghost";

function Acao({
  action,
  id,
  variante,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  variante: Variante;
  children: ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variante={variante}>
        {children}
      </Button>
    </form>
  );
}

const STATUS_TONE: Record<ProgramaAdmin["status"], "warning" | "success" | "neutral"> = {
  rascunho: "warning",
  publicado: "success",
  arquivado: "neutral",
};

export function ProgramaCard({ p }: { p: ProgramaAdmin }) {
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState<null | "arquivar" | "excluir">(null);
  const arquivado = p.status === "arquivado";

  return (
    <>
      <div className={`rounded-2xl border border-border bg-surface p-4 ${arquivado ? "opacity-70" : ""}`}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-text">{p.nome}</p>
            {p.descricao ? <p className="mt-0.5 truncate text-xs text-subtle">{p.descricao}</p> : null}
          </div>
          <Tag tone={STATUS_TONE[p.status]} className="shrink-0">
            {STATUS_LABEL[p.status]}
          </Tag>
        </div>
        <p className="text-sm text-subtle">
          {p.temporada_nome ? (
            <>
              {p.temporada_nome}
              {p.temporada_ano ? ` (${p.temporada_ano})` : ""} ·{" "}
            </>
          ) : null}
          {p.duracao_dias}d · {p.fases} fases · {p.dias} dias
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ButtonLink href={`/admin/programas/${p.id}`} variante="secondary">
            Abrir protocolo
          </ButtonLink>
          <Button variante="outline" onClick={() => setSheet(true)}>
            Ações
          </Button>
        </div>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title={p.nome}>
        <div className="flex flex-col gap-3">
          <ButtonLink href={`/admin/programas/${p.id}/editar`} variante="secondary">
            Editar
          </ButtonLink>
          {!arquivado ? (
            p.is_publicado ? (
              <Acao action={despublicarProgramaLista} id={p.id} variante="outline">
                Despublicar
              </Acao>
            ) : (
              <Acao action={publicarProgramaLista} id={p.id} variante="outline">
                Publicar
              </Acao>
            )
          ) : null}
          <Acao action={duplicarPrograma} id={p.id} variante="outline">
            Duplicar
          </Acao>
          {arquivado ? (
            <Acao action={desarquivarPrograma} id={p.id} variante="outline">
              Restaurar
            </Acao>
          ) : (
            <Button variante="danger" onClick={() => { setSheet(false); setDialog("arquivar"); }}>
              Arquivar
            </Button>
          )}
          <Button variante="danger" onClick={() => { setSheet(false); setDialog("excluir"); }}>
            Excluir
          </Button>
          <Button variante="ghost" onClick={() => setSheet(false)}>
            Fechar
          </Button>
        </div>
      </BottomSheet>

      <Dialog open={dialog === "arquivar"} onClose={() => setDialog(null)} title={`Arquivar "${p.nome}"?`}>
        <p className="mb-5 text-sm text-muted">
          Ele sai da gestão ativa, mas o histórico é preservado. Você pode restaurar depois.
        </p>
        <div className="flex flex-col gap-3">
          <Acao action={arquivarPrograma} id={p.id} variante="danger">
            Arquivar
          </Acao>
          <Button variante="ghost" onClick={() => setDialog(null)}>
            Voltar
          </Button>
        </div>
      </Dialog>

      <Dialog open={dialog === "excluir"} onClose={() => setDialog(null)} title={`Excluir "${p.nome}"?`}>
        <p className="mb-5 text-sm text-muted">
          Exclusão definitiva — só funciona se não houver turmas, matrículas ou acessos vinculados.
        </p>
        <div className="flex flex-col gap-3">
          <Acao action={excluirPrograma} id={p.id} variante="danger">
            Excluir definitivamente
          </Acao>
          <Button variante="ghost" onClick={() => setDialog(null)}>
            Voltar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
