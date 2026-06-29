"use client";

import { useMemo, useState } from "react";
import { criarGuerreiro } from "@/lib/admin/criar-guerreiro";
import { TextInput, Select } from "@/components/ui/fields";
import { Button } from "@/components/ui/primitives";

/**
 * Wizard "Novo Guerreiro" — 4 etapas numa única tela e num único envio.
 * Form único (todas as etapas montadas; ocultas via CSS para preservar valores)
 * → server action criarGuerreiro(). Mobile-first, alvos ≥48px (campos do DS).
 */
type Programa = { id: string; nome: string };
type Turma = { id: string; codigo: string; programa_id: string; status: string };

const PASSOS = ["Dados", "Programa", "Permissões", "Acesso"];

export function NovoGuerreiroForm({
  programas,
  turmas,
}: {
  programas: Programa[];
  turmas: Turma[];
}) {
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [programaId, setProgramaId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const turmasDoPrograma = useMemo(
    () =>
      turmas.filter(
        (t) => t.programa_id === programaId && t.status !== "encerrada" && t.status !== "arquivada",
      ),
    [turmas, programaId],
  );

  const podeAvancar =
    (passo === 1 && nome.trim() && email.includes("@")) ||
    (passo === 2 && programaId && turmaId) ||
    passo === 3;

  const mostra = (n: number) => (passo === n ? "" : "hidden");

  return (
    <form action={criarGuerreiro} className="flex flex-col gap-6">
      {/* Indicador de etapas */}
      <ol className="flex items-center gap-2" aria-label="Etapas">
        {PASSOS.map((p, i) => {
          const n = i + 1;
          const ativo = n === passo;
          const feito = n < passo;
          return (
            <li key={p} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                  ativo
                    ? "bg-gold text-ground"
                    : feito
                      ? "bg-gold/30 text-gold-bright"
                      : "border border-border text-subtle"
                }`}
              >
                {n}
              </span>
              <span className={`text-[0.65rem] ${ativo ? "text-gold-bright" : "text-subtle"}`}>{p}</span>
            </li>
          );
        })}
      </ol>

      {/* ETAPA 1 — Dados pessoais */}
      <div className={`flex flex-col gap-4 ${mostra(1)}`}>
        <h2 className="text-sm uppercase tracking-wider text-subtle">Dados pessoais</h2>
        <TextInput
          label="Nome do Guerreiro"
          name="nome_guerreiro"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <TextInput
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextInput label="Cidade" name="cidade" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted" htmlFor="foto">
            Foto (opcional)
          </label>
          <input
            id="foto"
            name="foto"
            type="file"
            accept="image/*"
            className="min-h-tap rounded-xl border border-border bg-ground px-3.5 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:text-text"
          />
        </div>
      </div>

      {/* ETAPA 2 — Programa */}
      <div className={`flex flex-col gap-4 ${mostra(2)}`}>
        <h2 className="text-sm uppercase tracking-wider text-subtle">Programa</h2>
        <Select
          label="Programa"
          name="programaId"
          value={programaId}
          onChange={(e) => {
            setProgramaId(e.target.value);
            setTurmaId("");
          }}
          required
        >
          <option value="" disabled>
            Selecione…
          </option>
          {programas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Select
          label="Turma"
          name="turmaId"
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          hint={programaId && turmasDoPrograma.length === 0 ? "Nenhuma turma disponível neste programa." : undefined}
          required
        >
          <option value="" disabled>
            {programaId ? "Selecione…" : "Escolha o programa primeiro"}
          </option>
          {turmasDoPrograma.map((t) => (
            <option key={t.id} value={t.id}>
              {t.codigo}
            </option>
          ))}
        </Select>
      </div>

      {/* ETAPA 3 — Permissões */}
      <div className={`flex flex-col gap-4 ${mostra(3)}`}>
        <h2 className="text-sm uppercase tracking-wider text-subtle">Permissões</h2>
        <label className="flex items-center gap-3 text-sm text-text">
          <input type="checkbox" checked disabled className="size-4 accent-gold" />
          Guerreiro <span className="text-xs text-subtle">(sempre)</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-text">
          <input type="checkbox" name="area_admin" value="1" className="size-4 accent-gold" />
          Administrador <span className="text-xs text-subtle">(acesso às duas áreas)</span>
        </label>
      </div>

      {/* ETAPA 4 — Forma de acesso */}
      <div className={`flex flex-col gap-3 ${mostra(4)}`}>
        <h2 className="text-sm uppercase tracking-wider text-subtle">Forma de acesso</h2>
        {[
          ["convite", "Enviar convite imediatamente", "E-mail de convite (fluxo existente)."],
          ["criar", "Criar acesso imediatamente", "Sem e-mail; entra via “Esqueci minha senha”."],
          ["link", "Gerar link de acesso", "Gera um link para você enviar manualmente."],
        ].map(([value, titulo, desc], i) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 has-[:checked]:border-gold has-[:checked]:bg-gold/[0.06]"
          >
            <input
              type="radio"
              name="forma"
              value={value}
              defaultChecked={i === 0}
              className="mt-0.5 size-4 accent-gold"
            />
            <span>
              <span className="block text-sm font-medium text-text">{titulo}</span>
              <span className="block text-xs text-subtle">{desc}</span>
            </span>
          </label>
        ))}
      </div>

      {/* Navegação */}
      <div className="flex gap-3">
        {passo > 1 ? (
          <Button type="button" variante="secondary" onClick={() => setPasso((p) => p - 1)}>
            Voltar
          </Button>
        ) : null}
        {passo < 4 ? (
          <Button
            type="button"
            variante="primary"
            disabled={!podeAvancar}
            onClick={() => setPasso((p) => p + 1)}
          >
            Próximo
          </Button>
        ) : (
          <Button type="submit" variante="primary">
            CRIAR GUERREIRO
          </Button>
        )}
      </div>
    </form>
  );
}
