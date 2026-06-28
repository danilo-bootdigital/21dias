import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Layout administrativo. Mantém o gate de acesso (auth + is_admin) e apenas
 * envolve as telas no AdminShell mobile-first (Sprint 1). Nenhuma tela interna
 * é redesenhada aqui; nenhuma regra de negócio é alterada.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: ehAdmin } = await supabase.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");

  return <AdminShell>{children}</AdminShell>;
}
