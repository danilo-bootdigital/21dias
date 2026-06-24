import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { sair } from "@/lib/auth/actions";
import { AreaSwitch } from "@/components/ui/area-switch";

const NAV: [string, string][] = [
  ["/admin", "Dashboard"],
  ["/admin/turmas", "Turmas"],
  ["/admin/programas", "Programas"],
  ["/admin/guerreiros", "Guerreiros"],
  ["/admin/matriculas", "Matrículas"],
  ["/admin/entitlements", "Entitlements"],
  ["/admin/acesso", "Conceder acesso"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm uppercase tracking-[0.3em] text-gold">Código 21 · Admin</span>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="transition hover:text-gold">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <AreaSwitch href="/dashboard">Área do Guerreiro</AreaSwitch>
          <form action={sair}>
            <button type="submit" className="text-sm text-subtle transition hover:text-gold">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
