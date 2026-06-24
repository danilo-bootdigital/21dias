import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { sair } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/avatar";
import { AreaSwitch } from "@/components/ui/area-switch";

const NAV: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/protocolo", "Protocolo"],
  ["/missao", "Missão"],
  ["/ranking", "Ranking"],
  ["/certificado", "Certificado"],
  ["/hall", "Hall"],
  ["/perfil", "Perfil"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Identidade exibida no header (avatar + nome + papel).
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
  const nome = perfil?.nome_guerreiro?.trim() || (user.email ?? "Guerreiro");
  const papel = ehAdmin ? "Admin" : "Guerreiro";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-sm uppercase tracking-[0.3em] text-gold">Código 21</span>
        <div className="flex items-center gap-4">
          <Link href="/perfil" className="flex items-center gap-3 transition hover:opacity-90">
            <Avatar src={perfil?.foto_url} nome={nome} size={36} />
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm text-text">{nome}</span>
              <span className="text-xs text-subtle">{papel}</span>
            </span>
          </Link>
          <form action={sair}>
            <button type="submit" className="text-sm text-subtle transition hover:text-gold">
              Sair
            </button>
          </form>
        </div>
      </header>
      <nav className="border-b border-border px-6">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-4 py-3 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-subtle transition hover:text-gold">
              {label}
            </Link>
          ))}
          {ehAdmin ? (
            <AreaSwitch href="/admin" className="ml-auto">
              Área Administrativa
            </AreaSwitch>
          ) : null}
        </div>
      </nav>
      <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}
