import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { salvarPerfil } from "@/lib/auth/actions";

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
        .select("nome_guerreiro, cidade, foto_url, bio")
        .eq("user_id", domainUser.id)
        .maybeSingle()
    : { data: null };

  const p = (perfil ?? {}) as {
    nome_guerreiro?: string;
    cidade?: string;
    foto_url?: string;
    bio?: string;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Perfil do Guerreiro</h1>
      <p className="mt-1 text-muted">{user.email}</p>

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

      <form action={salvarPerfil} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Nome de guerreiro
          <input
            name="nome_guerreiro"
            required
            defaultValue={p.nome_guerreiro ?? ""}
            className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Cidade
          <input
            name="cidade"
            defaultValue={p.cidade ?? ""}
            className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Foto (URL)
          <input
            name="foto_url"
            type="url"
            defaultValue={p.foto_url ?? ""}
            className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Bio
          <textarea
            name="bio"
            rows={3}
            defaultValue={p.bio ?? ""}
            className="rounded-lg border border-border bg-ground px-3 py-2 text-text outline-none focus:border-gold"
          />
        </label>
        <button
          type="submit"
          className="self-start rounded-lg bg-gold px-5 py-2 font-medium text-ground transition hover:bg-gold-strong"
        >
          Salvar perfil
        </button>
      </form>
    </div>
  );
}
