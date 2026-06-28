import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { nomeDeGuerreiro } from "@/lib/identity";

// ---------------------------------------------------------------------------
// Leitura do Feed da turma. O feed é POR TURMA: cada guerreiro vê os posts da
// sua matrícula ativa. A RLS (migration 0002) já garante o escopo — aqui só
// montamos os dados para a UI, seguindo o padrão de casts manuais do projeto
// (types/database.ts ainda é placeholder).
// ---------------------------------------------------------------------------

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>;

export type ComentarioVM = {
  id: string;
  autorNome: string;
  autorFoto: string | null;
  texto: string;
  meu: boolean;
};

export type PostVM = {
  id: string;
  autorNome: string;
  autorFoto: string | null;
  conteudo: string;
  status: "publicado" | "oculto" | "removido";
  createdAt: string;
  curtidas: number;
  euCurti: boolean;
  meuPost: boolean;
  comentarios: ComentarioVM[];
};

export type FeedVM = {
  semTurma: boolean;
  turmaCodigo: string | null;
  programaNome: string | null;
  meuMatriculaId: string | null;
  podeModear: boolean;
  posts: PostVM[];
};

/**
 * Matrícula ATIVA mais recente do usuário autenticado (a mesma regra do
 * Dashboard). Define qual feed de turma o guerreiro enxerga e com qual
 * matrícula ele posta/curte/comenta. Compartilhada com as server actions.
 */
export async function matriculaAtivaDoUsuario(
  supabase: SupabaseServer,
): Promise<{ matriculaId: string; turmaId: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: duRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainId = (duRow as { id: string } | null)?.id;
  if (!domainId) return null;

  const { data: mRow } = await supabase
    .from("matriculas")
    .select("id, turma_id")
    .eq("user_id", domainId)
    .eq("status", "ativa")
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const m = mRow as { id: string; turma_id: string } | null;
  return m ? { matriculaId: m.id, turmaId: m.turma_id } : null;
}

const vazio = (over: Partial<FeedVM> = {}): FeedVM => ({
  semTurma: true,
  turmaCodigo: null,
  programaNome: null,
  meuMatriculaId: null,
  podeModear: false,
  posts: [],
  ...over,
});

export async function carregarFeed(): Promise<FeedVM> {
  const supabase = await createServerSupabase();

  const ativa = await matriculaAtivaDoUsuario(supabase);
  if (!ativa) return vazio();
  const { matriculaId, turmaId } = ativa;

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  const podeModear = Boolean(ehAdmin); // no MVP, o único staff ativo é admin

  // Cabeçalho da turma (best-effort).
  const { data: turmaRow } = await supabase
    .from("turmas")
    .select("codigo, programas(nome)")
    .eq("id", turmaId)
    .maybeSingle();
  const turma = turmaRow as { codigo: string; programas: { nome: string } | null } | null;

  // Posts da turma. Membros veem apenas 'publicado'; staff vê todos os status
  // (para poder ocultar/republicar). Ordena do mais recente para o mais antigo.
  let q = supabase
    .from("posts")
    .select("id, matricula_id, conteudo, status, created_at")
    .eq("turma_id", turmaId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!podeModear) q = q.eq("status", "publicado");
  const { data: postRows } = await q;
  const posts = (postRows ?? []) as {
    id: string;
    matricula_id: string;
    conteudo: string | null;
    status: PostVM["status"];
    created_at: string;
  }[];

  if (posts.length === 0)
    return vazio({
      semTurma: false,
      turmaCodigo: turma?.codigo ?? null,
      programaNome: turma?.programas?.nome ?? null,
      meuMatriculaId: matriculaId,
      podeModear,
      posts: [],
    });

  const postIds = posts.map((p) => p.id);

  // Comentários dos posts (mais antigos primeiro, leitura natural).
  const { data: comRows } = await supabase
    .from("comentarios")
    .select("id, post_id, matricula_id, texto, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });
  const comentarios = (comRows ?? []) as {
    id: string;
    post_id: string;
    matricula_id: string;
    texto: string;
    created_at: string;
  }[];

  // Curtidas dos posts (para contagem + "eu curti").
  const { data: curtRows } = await supabase
    .from("curtidas")
    .select("post_id, matricula_id")
    .in("post_id", postIds);
  const curtidas = (curtRows ?? []) as { post_id: string; matricula_id: string }[];

  // Identidade dos autores (posts + comentários): matrícula -> user -> perfil.
  const matriculaIds = Array.from(
    new Set([...posts, ...comentarios].map((x) => x.matricula_id)),
  );
  const { data: matRows } = await supabase
    .from("matriculas")
    .select("id, user_id")
    .in("id", matriculaIds);
  const matToUser = new Map(
    ((matRows ?? []) as { id: string; user_id: string }[]).map((r) => [r.id, r.user_id]),
  );

  const userIds = Array.from(new Set([...matToUser.values()]));
  const { data: perfRows } = userIds.length
    ? await supabase
        .from("guerreiro_profiles")
        .select("user_id, nome_guerreiro, foto_url")
        .in("user_id", userIds)
    : { data: [] };
  const userToPerfil = new Map(
    ((perfRows ?? []) as { user_id: string; nome_guerreiro: string; foto_url: string | null }[]).map(
      (r) => [r.user_id, r],
    ),
  );

  const identidade = (matriculaIdAutor: string) => {
    const userId = matToUser.get(matriculaIdAutor);
    const perfil = userId ? userToPerfil.get(userId) : undefined;
    return {
      nome: nomeDeGuerreiro(perfil?.nome_guerreiro), // identidade pública (nunca e-mail)
      foto: perfil?.foto_url ?? null,
    };
  };

  const comentariosPorPost = new Map<string, ComentarioVM[]>();
  for (const c of comentarios) {
    const id = identidade(c.matricula_id);
    const arr = comentariosPorPost.get(c.post_id) ?? [];
    arr.push({
      id: c.id,
      autorNome: id.nome,
      autorFoto: id.foto,
      texto: c.texto,
      meu: c.matricula_id === matriculaId,
    });
    comentariosPorPost.set(c.post_id, arr);
  }

  const curtidasPorPost = new Map<string, { total: number; eu: boolean }>();
  for (const c of curtidas) {
    const cur = curtidasPorPost.get(c.post_id) ?? { total: 0, eu: false };
    cur.total += 1;
    if (c.matricula_id === matriculaId) cur.eu = true;
    curtidasPorPost.set(c.post_id, cur);
  }

  const vm: PostVM[] = posts.map((p) => {
    const id = identidade(p.matricula_id);
    const cur = curtidasPorPost.get(p.id) ?? { total: 0, eu: false };
    return {
      id: p.id,
      autorNome: id.nome,
      autorFoto: id.foto,
      conteudo: p.conteudo ?? "",
      status: p.status,
      createdAt: p.created_at,
      curtidas: cur.total,
      euCurti: cur.eu,
      meuPost: p.matricula_id === matriculaId,
      comentarios: comentariosPorPost.get(p.id) ?? [],
    };
  });

  return {
    semTurma: false,
    turmaCodigo: turma?.codigo ?? null,
    programaNome: turma?.programas?.nome ?? null,
    meuMatriculaId: matriculaId,
    podeModear,
    posts: vm,
  };
}
