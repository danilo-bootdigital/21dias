import { notFound } from "next/navigation";
import { CentralCadastros } from "@/components/admin/central-cadastros";
import type { CadastroRow } from "@/lib/admin/cadastros-data";

/**
 * Preview DEV-ONLY da Central de Cadastros (404 em produção). Exercita todos os
 * status operacionais com dados mockados.
 */
export default async function CentralPreview({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { f } = await searchParams;

  const rows: CadastroRow[] = [
    { userId: "1", nome: "Aparecido Mendonça", temPerfil: true, cidade: "São Paulo", email: "aparecido@ex.com", foto: null, createdAt: "2026-06-30T12:00:00Z", programa: "Código 21", turma: "T-01", ehAdmin: false, status: "aguardando_matricula", matriculaId: null, recente: true },
    { userId: "2", nome: "Willis Barreto", temPerfil: true, cidade: "Rio de Janeiro", email: "willis@ex.com", foto: null, createdAt: "2026-06-28T12:00:00Z", programa: "Código 21", turma: "T-01", ehAdmin: false, status: "convite_pendente", matriculaId: "m2", recente: false },
    { userId: "3", nome: "Luís Enegia", temPerfil: true, cidade: "Belo Horizonte", email: "luis@ex.com", foto: null, createdAt: "2026-06-25T12:00:00Z", programa: "Código 21", turma: "T-01", ehAdmin: false, status: "nunca_acessou", matriculaId: "m3", recente: false },
    { userId: "4", nome: "Danilo Oliveira", temPerfil: true, cidade: "Curitiba", email: "danilo@ex.com", foto: null, createdAt: "2026-06-20T12:00:00Z", programa: "Código 21", turma: "T-01", ehAdmin: true, status: "ativo", matriculaId: "m4", recente: false },
    { userId: "5", nome: "Marina Costa", temPerfil: true, cidade: "Salvador", email: "marina@ex.com", foto: null, createdAt: "2026-05-10T12:00:00Z", programa: "Código 21", turma: "T-00", ehAdmin: false, status: "concluido", matriculaId: "m5", recente: false },
    { userId: "6", nome: "Novo Guerreiro", temPerfil: false, cidade: null, email: "sem.perfil@ex.com", foto: null, createdAt: "2026-06-30T09:00:00Z", programa: null, turma: null, ehAdmin: false, status: "aguardando_matricula", matriculaId: null, recente: true },
    { userId: "7", nome: "Pedro Alves", temPerfil: true, cidade: "Recife", email: "pedro@ex.com", foto: null, createdAt: "2026-04-01T12:00:00Z", programa: "Código 21", turma: "T-00", ehAdmin: false, status: "cancelado", matriculaId: "m7", recente: false },
  ];

  return (
    <div className="mx-auto min-h-[100dvh] max-w-screen-md px-5 pb-24 pt-6">
      <CentralCadastros rows={rows} filtro={f ?? "todos"} />
    </div>
  );
}
