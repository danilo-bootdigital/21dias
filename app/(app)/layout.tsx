import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { AreaSwitch } from "@/components/ui/area-switch";
import { BottomNav } from "@/components/ui/bottom-nav";
import { nomeDeGuerreiro } from "@/lib/identity";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Identidade exibida no header (avatar + nome).
  const { data: domainUserRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const domainUser = domainUserRow as { id: string } | null;

  const { data: perfilRow } = domainUser
    ? await supabase
        .from("guerreiro_profiles")
        .select("nome_guerreiro, foto_url")
        .eq("user_id", domainUser.id)
        .maybeSingle()
    : { data: null };
  const perfil = perfilRow as { nome_guerreiro?: string; foto_url?: string } | null;

  const { data: ehAdmin } = await supabase.rpc("is_admin");
  // Identidade pública: nunca o e-mail (ver lib/identity.ts).
  const nome = nomeDeGuerreiro(perfil?.nome_guerreiro);

  return (
    <div className="min-h-[100dvh]">
      {/* TopBar mínima — marca + (switch admin) + avatar. Sem navegação aqui:
          a navegação principal mora na barra inferior (zona do polegar). */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-ground/90 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <span className="font-display text-sm font-bold uppercase tracking-[0.28em] text-gold">
          Código 21
        </span>
        <div className="flex items-center gap-3">
          {ehAdmin ? <AreaSwitch href="/admin">Admin</AreaSwitch> : null}
          <Link
            href="/perfil"
            aria-label="Abrir perfil"
            className="transition hover:opacity-90"
          >
            <Avatar src={perfil?.foto_url} nome={nome} size={34} />
          </Link>
        </div>
      </header>

      {/* Conteúdo. O padding inferior garante que nada fique sob a BottomNav. */}
      <main className="mx-auto max-w-screen-sm px-5 pb-[calc(76px+env(safe-area-inset-bottom))] pt-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
