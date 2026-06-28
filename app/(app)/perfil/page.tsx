import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { sair } from "@/lib/auth/actions";
import { nomeDeGuerreiro } from "@/lib/identity";
import { NomeComMedalha } from "@/components/gamificacao";
import { getEvolutionReward } from "@/lib/gamificacao/recompensa";
import { PerfilForm, type PerfilInicial } from "@/components/perfil/perfil-form";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: domainUserRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  const domainUser = domainUserRow as { id: string } | null;

  const { data: perfil } = domainUser
    ? await supabase
        .from("guerreiro_profiles")
        .select("nome_guerreiro, idade, peso, estado_civil, sexo, profissao, cidade, foto_url, bio")
        .eq("user_id", domainUser.id)
        .maybeSingle()
    : { data: null };

  const p = (perfil ?? {}) as Partial<PerfilInicial>;
  const inicial: PerfilInicial = {
    nome_guerreiro: p.nome_guerreiro ?? "",
    idade: p.idade ?? null,
    peso: p.peso ?? null,
    estado_civil: p.estado_civil ?? null,
    sexo: p.sexo ?? null,
    profissao: p.profissao ?? null,
    cidade: p.cidade ?? null,
    bio: p.bio ?? null,
    foto_url: p.foto_url ?? null,
  };

  // Percentual de evolução (índice de disciplina) — usado apenas para a
  // recompensa visual; NÃO altera nenhum cálculo de pontuação/evolução.
  let percentualEvolucao = 0;
  if (domainUser) {
    const { data: mRow } = await supabase
      .from("matriculas")
      .select("id")
      .eq("user_id", domainUser.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const matriculaId = (mRow as { id: string } | null)?.id;
    if (matriculaId) {
      const { data: paRow } = await supabase
        .from("pontuacao_agregada")
        .select("indice_disciplina, disciplina_final")
        .eq("matricula_id", matriculaId)
        .maybeSingle();
      const pa = (paRow ?? {}) as { indice_disciplina?: number; disciplina_final?: number };
      percentualEvolucao = Number(pa.disciplina_final ?? pa.indice_disciplina ?? 0);
    }
  }
  const recompensa = getEvolutionReward(percentualEvolucao);
  const nomeGuerreiro = nomeDeGuerreiro(p.nome_guerreiro);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Perfil do Guerreiro</h1>
      <p className="mt-1 text-muted">{user.email}</p>

      <div
        className={`mt-5 rounded-2xl border bg-surface p-5 ${
          recompensa.nivel === "ouro" ? "border-[#FFD54F]/40" : "border-border"
        }`}
      >
        <p className="text-xs uppercase tracking-wider text-subtle">Nome de guerreiro</p>
        <NomeComMedalha
          nome={nomeGuerreiro}
          percentual={percentualEvolucao}
          as="h2"
          className="mt-1 text-2xl"
        />
        <p className="mt-3 text-sm text-subtle">
          Evolução: <strong className="text-text">{Math.round(percentualEvolucao)}%</strong>
          {recompensa.temMedalha ? ` · ${recompensa.label} (${recompensa.faixa})` : " · sem medalha ainda"}
        </p>
      </div>

      {!domainUser ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Sua conta ainda não foi sincronizada (trigger 0003 pendente). Avise o suporte.
        </p>
      ) : null}
      {ok ? (
        <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
          Perfil salvo.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {decodeURIComponent(erro)}
        </p>
      ) : null}

      <PerfilForm inicial={inicial} authUserId={user.id} desabilitado={!domainUser} />

      <form action={sair} className="mt-10 border-t border-border pt-6">
        <button
          type="submit"
          className="text-sm text-subtle transition hover:text-gold"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}
