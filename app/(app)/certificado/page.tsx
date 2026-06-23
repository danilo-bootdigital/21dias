import { jornadaContexto } from "@/lib/jornada/contexto";
import { CertificadoView } from "@/components/jornada";

export default async function CertificadoPage() {
  const ctx = await jornadaContexto();
  if (!ctx || ctx.matriculas.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Certificado</h1>
        <p className="mt-3 text-muted">Você ainda não concluiu nenhuma turma.</p>
      </div>
    );
  }

  const { supabase } = ctx;

  const { data } = await supabase
    .from("certificados")
    .select(
      "nivel_final, disciplina_final, emitido_at, matriculas(turmas(codigo, programas(nome)))",
    )
    .order("emitido_at", { ascending: false });

  const certs = (data ?? []) as unknown as {
    nivel_final: string;
    disciplina_final: number;
    emitido_at: string;
    matriculas: {
      turmas: { codigo: string; programas: { nome: string } | null } | null;
    } | null;
  }[];

  if (certs.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold">Certificado</h1>
        <p className="mt-3 text-muted">
          Seu certificado aparecerá aqui quando a turma for concluída.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-semibold">Certificados</h1>
      {certs.map((c, i) => (
        <CertificadoView
          key={i}
          programa={c.matriculas?.turmas?.programas?.nome ?? "Código 21"}
          turma={c.matriculas?.turmas?.codigo ?? "—"}
          nivel={c.nivel_final}
          disciplina={Number(c.disciplina_final)}
          emitidoEm={new Date(c.emitido_at).toLocaleDateString("pt-BR")}
        />
      ))}
    </div>
  );
}
