"use client";

import { useState } from "react";
import { definirAcessoSistema } from "@/lib/admin/roles";

/**
 * Seção "Acesso ao Sistema" do cadastro do Guerreiro.
 *
 * Reaproveita o RBAC existente (role global `admin` em user_roles, lida por
 * is_admin()). A Área do Guerreiro é sempre habilitada — o admin só concede ou
 * remove a Área Administrativa. Perfil Administrativo e Escopo já ficam na tela
 * como estrutura PREPARADA (Staff/Suporte e escopos não-globais desabilitados);
 * no MVP apenas "Administrador Global" é persistido. Ver lib/admin/roles.ts.
 */

type PerfilAdmin = "administrador_global" | "staff" | "suporte";
type Escopo = "global" | "programa" | "turma";

const PERFIS: { value: PerfilAdmin; label: string; mvp: boolean }[] = [
  { value: "administrador_global", label: "Administrador Global", mvp: true },
  { value: "staff", label: "Staff", mvp: false },
  { value: "suporte", label: "Suporte", mvp: false },
];

const ESCOPOS: { value: Escopo; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "programa", label: "Apenas Programas" },
  { value: "turma", label: "Apenas Turmas" },
];

export function AcessoSistema({
  userId,
  ehAdminInicial,
  ehProprio,
}: {
  userId: string;
  ehAdminInicial: boolean;
  ehProprio: boolean;
}) {
  const [adminAtivo, setAdminAtivo] = useState(ehAdminInicial);
  const [perfil, setPerfil] = useState<PerfilAdmin>("administrador_global");
  const [escopo, setEscopo] = useState<Escopo>("global");

  // O próprio admin logado não pode remover o seu acesso (evita lockout).
  const travadoProprio = ehProprio && ehAdminInicial;
  // Escopo só faz sentido quando o perfil não é "Administrador Global".
  const mostrarEscopo = adminAtivo && perfil !== "administrador_global";

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface-raised px-4 py-4">
      <h2 className="mb-1 text-sm uppercase tracking-wider text-subtle">Acesso ao Sistema</h2>
      <p className="mb-4 text-xs text-subtle">
        Todo administrador também é guerreiro. A Área do Guerreiro permanece sempre habilitada; o
        acesso administrativo é concedido ou removido aqui.
      </p>

      <form action={definirAcessoSistema} className="flex flex-col gap-4">
        <input type="hidden" name="user_id" value={userId} />

        {/* Área do Guerreiro — sempre habilitada (qualquer autenticado). */}
        <label className="flex items-center gap-3 text-sm text-text">
          <input type="checkbox" checked disabled className="h-4 w-4 accent-gold" />
          Área do Guerreiro
          <span className="text-xs text-subtle">(sempre habilitada)</span>
        </label>

        {/* Área Administrativa — concede/revoga a role global `admin`. */}
        <label className="flex items-center gap-3 text-sm text-text">
          <input
            type="checkbox"
            name="area_admin"
            value="1"
            checked={adminAtivo}
            disabled={travadoProprio}
            onChange={(e) => setAdminAtivo(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          Área Administrativa
        </label>

        {/* Perfil Administrativo — aparece ao habilitar a Área Administrativa. */}
        {adminAtivo ? (
          <fieldset className="ml-7 flex flex-col gap-2 border-l border-border pl-4">
            <legend className="text-xs uppercase tracking-wider text-subtle">
              Perfil Administrativo
            </legend>
            {PERFIS.map((p) => (
              <label
                key={p.value}
                className={`flex items-center gap-2 text-sm ${p.mvp ? "text-text" : "text-subtle"}`}
              >
                <input
                  type="radio"
                  name="perfil_admin"
                  value={p.value}
                  checked={perfil === p.value}
                  disabled={!p.mvp}
                  onChange={() => setPerfil(p.value)}
                  className="h-4 w-4 accent-gold"
                />
                {p.label}
                {p.mvp ? null : <span className="text-xs text-subtle">(em breve)</span>}
              </label>
            ))}
          </fieldset>
        ) : null}

        {/* Escopo — estrutura preparada (desabilitada no MVP). */}
        {mostrarEscopo ? (
          <fieldset className="ml-7 flex flex-col gap-2 border-l border-border pl-4">
            <legend className="text-xs uppercase tracking-wider text-subtle">Escopo</legend>
            {ESCOPOS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-subtle">
                <input
                  type="radio"
                  name="escopo"
                  value={s.value}
                  checked={escopo === s.value}
                  disabled
                  onChange={() => setEscopo(s.value)}
                  className="h-4 w-4 accent-gold"
                />
                {s.label}
              </label>
            ))}
            <span className="text-xs text-subtle">(em breve)</span>
          </fieldset>
        ) : null}

        <div>
          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ground transition hover:bg-gold-strong"
          >
            Salvar acesso
          </button>
        </div>
      </form>

      {travadoProprio ? (
        <p className="mt-2 text-xs text-amber-300">
          Este é o seu próprio usuário — você não pode remover o seu acesso de administrador.
        </p>
      ) : null}
    </section>
  );
}
