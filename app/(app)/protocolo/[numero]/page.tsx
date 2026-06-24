import Link from "next/link";
import { notFound } from "next/navigation";
import { jornadaContexto } from "@/lib/jornada/contexto";
import { Aviso } from "@/components/admin/ui";
import { DiaProtocoloView, CheckinForm } from "@/components/jornada";
import { CampoImagemUploader } from "@/components/jornada/protocolo-imagens";

export default async function DiaProtocoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { numero } = await params;
  const { ok, erro } = await searchParams;
  const n = Number(numero);

  const ctx = await jornadaContexto();
  // Matrícula de referência: ativa (operacional) OU a mais recente (modo leitura).
  const ref = ctx ? (ctx.ativa ?? ctx.matriculas[0] ?? null) : null;
  if (!ctx || !ref) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Protocolo</h1>
        <p className="mt-3 text-muted">Você não tem uma jornada no momento.</p>
      </div>
    );
  }

  const { supabase } = ctx;

  const { data: tRow } = await supabase
    .from("turmas")
    .select("programa_id, status")
    .eq("id", ref.turma_id)
    .maybeSingle();
  const t = tRow as { programa_id: string; status: string } | null;
  if (!t || !Number.isFinite(n)) notFound();
  const turmaAtiva = t!.status === "ativa";

  const { data: diaData } = await supabase.rpc("dia_corrente_turma", { p_turma: ref.turma_id });
  const dc = Number(diaData);

  const voltar = (
    <Link href="/protocolo" className="text-sm text-subtle transition hover:text-gold">
      ← Protocolo
    </Link>
  );

  // Dia futuro só é bloqueado em turma ATIVA; em histórico tudo até a duração é leitura.
  if (turmaAtiva && n > dc) {
    return (
      <div>
        {voltar}
        <h1 className="mt-2 font-display text-3xl font-semibold">Dia {n}</h1>
        <p className="mt-3 text-muted">
          🔒 Este dia ainda está bloqueado. Volte quando a jornada chegar ao Dia {n}.
        </p>
      </div>
    );
  }

  const { data: dRow } = await supabase
    .from("protocolo_dias")
    .select(
      "id, numero, titulo, protocolo_descricao, protocolo_ativo, instrucoes, missao_titulo, missao_descricao, missao_pontos, eh_marco, marco_titulo, marco_descricao, programa_fases(nome)",
    )
    .eq("programa_id", t!.programa_id)
    .eq("numero", n)
    .maybeSingle();
  const d = dRow as unknown as {
    id: string;
    numero: number;
    titulo: string | null;
    protocolo_descricao: string | null;
    protocolo_ativo: boolean;
    instrucoes: string | null;
    missao_titulo: string;
    missao_descricao: string | null;
    missao_pontos: number;
    eh_marco: boolean;
    marco_titulo: string | null;
    marco_descricao: string | null;
    programa_fases: { nome: string } | null;
  } | null;
  if (!d) notFound();

  // Protocolo inativo: o guerreiro não visualiza o conteúdo do dia.
  if (!d!.protocolo_ativo) {
    return (
      <div>
        {voltar}
        <h1 className="mt-2 font-display text-3xl font-semibold">Dia {n}</h1>
        <p className="mt-3 text-muted">Protocolo indisponível para este dia.</p>
      </div>
    );
  }

  const { data: contData } = await supabase
    .from("protocolo_conteudos")
    .select("tipo, titulo, corpo")
    .eq("dia_id", d!.id)
    .order("ordem");
  const conteudos = (contData ?? []) as { tipo: string; titulo: string | null; corpo: string }[];

  const ehHoje = n === dc;
  // Só opera (check-in) quando há jornada ATIVA operacional e é o dia corrente.
  const podeOperar = !!ctx.ativa && ehHoje && turmaAtiva;

  const { data: habsRow } = await supabase
    .from("habitos_definicao")
    .select("id, nome")
    .eq("programa_id", t!.programa_id)
    .order("ordem");
  const habitos = (habsRow ?? []) as { id: string; nome: string }[];

  const { data: ckRow } = await supabase
    .from("checkins")
    .select("id, missao_completa, check_in_publico")
    .eq("matricula_id", ref.id)
    .eq("dia_numero", n)
    .maybeSingle();
  const ck = ckRow as { id: string; missao_completa: boolean; check_in_publico: boolean } | null;
  let cumpridos: string[] = [];
  let itensMarcados: string[] = [];
  if (ck) {
    const { data: chRow } = await supabase
      .from("checkin_habitos")
      .select("habito_id, cumprido")
      .eq("checkin_id", ck.id);
    cumpridos = ((chRow ?? []) as { habito_id: string; cumprido: boolean }[])
      .filter((x) => x.cumprido)
      .map((x) => x.habito_id);
    const { data: respRow } = await supabase
      .from("protocolo_checkin_respostas")
      .select("item_id, marcado")
      .eq("checkin_id", ck.id);
    itensMarcados = ((respRow ?? []) as { item_id: string; marcado: boolean }[])
      .filter((x) => x.marcado)
      .map((x) => x.item_id);
  }

  // Check-in do Dia (checklist por dia, sem pontuação).
  const { data: itensRow } = await supabase
    .from("protocolo_checkin_itens")
    .select("id, texto, ordem")
    .eq("dia_id", d!.id)
    .order("ordem");
  const itens = ((itensRow ?? []) as { id: string; texto: string; ordem: number }[]).map((i) => ({
    id: i.id,
    texto: i.texto,
  }));

  // Campos de imagem ativos + envios do guerreiro neste dia.
  const { data: camposRow } = await supabase
    .from("protocolo_imagem_campos")
    .select("slot, titulo, instrucao, obrigatorio, ativo")
    .eq("dia_id", d!.id)
    .eq("ativo", true)
    .order("slot");
  const campos = (camposRow ?? []) as {
    slot: number;
    titulo: string | null;
    instrucao: string | null;
    obrigatorio: boolean;
  }[];

  let enviosPorSlot: Record<number, string[]> = {};
  if (campos.length) {
    const { data: envRow } = await supabase
      .from("protocolo_imagem_envios")
      .select("slot, url, created_at")
      .eq("matricula_id", ref.id)
      .eq("dia_numero", n)
      .order("created_at");
    enviosPorSlot = ((envRow ?? []) as { slot: number; url: string }[]).reduce(
      (acc, e) => {
        (acc[e.slot] ??= []).push(e.url);
        return acc;
      },
      {} as Record<number, string[]>,
    );
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const authUserId = authUser?.id ?? "";

  return (
    <div>
      {voltar}
      <h1 className="mt-2 font-display text-3xl font-semibold">Dia {n}</h1>
      <p className="mb-4 text-sm text-subtle">{d!.programa_fases?.nome ?? "—"}</p>
      <Aviso
        ok={ok === "checkin" ? "Check-in salvo." : ok === "imagem_enviada" ? "Imagem enviada." : ok}
        erro={erro}
      />

      <DiaProtocoloView
        titulo={d!.titulo}
        descricao={d!.protocolo_descricao}
        instrucoes={d!.instrucoes}
        missaoTitulo={d!.missao_titulo}
        missaoDescricao={d!.missao_descricao}
        missaoPontos={d!.missao_pontos}
        ehMarco={d!.eh_marco}
        marcoTitulo={d!.marco_titulo}
        marcoDescricao={d!.marco_descricao}
        conteudos={conteudos}
      />

      <h2 className="mb-2 mt-6 text-sm uppercase tracking-wider text-subtle">Check-in do Dia</h2>
      {podeOperar ? (
        <CheckinForm
          dia={n}
          podeOperar={podeOperar}
          habitos={habitos}
          cumpridos={cumpridos}
          itens={itens}
          itensMarcados={itensMarcados}
          missaoTitulo={d!.missao_titulo}
          missaoCompleta={ck?.missao_completa ?? false}
          publico={ck?.check_in_publico ?? false}
          retorno={`/protocolo/${n}`}
        />
      ) : ck ? (
        <div className="flex flex-col gap-2">
          {itens.length ? (
            <ul className="flex flex-col gap-1">
              {itens.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-sm text-muted">
                  <span>{itensMarcados.includes(it.id) ? "✅" : "⬜️"}</span>
                  {it.texto}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
            ✅ Concluído — {cumpridos.length}/{habitos.length} inegociáveis
            {ck.missao_completa ? " + missão" : ""}.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          ⚠️ Dia sem check-in (não realizado). Não é possível registrar dias passados.
        </p>
      )}

      {campos.length ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-subtle">Imagens do Dia</h2>
          <div className="flex flex-col gap-3">
            {campos.map((c) => (
              <CampoImagemUploader
                key={c.slot}
                authUserId={authUserId}
                diaNumero={n}
                campo={c}
                enviados={enviosPorSlot[c.slot] ?? []}
                podeEnviar={podeOperar}
                retorno={`/protocolo/${n}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
