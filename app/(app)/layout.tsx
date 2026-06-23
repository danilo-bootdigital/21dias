import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { sair } from "@/lib/auth/actions";

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

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-sm uppercase tracking-[0.3em] text-gold">Código 21</span>
        <form action={sair}>
          <button type="submit" className="text-sm text-subtle transition hover:text-gold">
            Sair
          </button>
        </form>
      </header>
      <nav className="border-b border-border px-6">
        <div className="mx-auto flex max-w-2xl flex-wrap gap-4 py-3 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-subtle transition hover:text-gold">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}
