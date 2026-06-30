import { listarCadastros } from "@/lib/admin/cadastros-data";
import { CentralCadastros } from "@/components/admin/central-cadastros";

/**
 * Central de Cadastros — centro operacional do admin. Lista TODOS os usuários
 * (base em `users`, para incluir quem se cadastrou e ainda não foi matriculado),
 * com status operacional derivado e ações rápidas. Reaproveita toda a lógica
 * existente (matrículas, convite, perfil). Ver lib/admin/cadastros-data.ts.
 */
export default async function GuerreirosPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; ok?: string; erro?: string }>;
}) {
  const { f, ok, erro } = await searchParams;
  const rows = await listarCadastros(new Date().toISOString());
  return <CentralCadastros rows={rows} filtro={f ?? "todos"} ok={ok} erro={erro} />;
}
