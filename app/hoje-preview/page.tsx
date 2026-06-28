import { notFound } from "next/navigation";
import { HojeView } from "../(app)/dashboard/_components/hoje-view";

/**
 * Preview DEV-ONLY da tela "Hoje" com dados fictícios — para validação visual
 * (a tela real exige sessão/turma). Não vai para produção (404).
 */
export default function HojePreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="mx-auto min-h-[100dvh] max-w-screen-sm px-5 pb-24 pt-6">
      <HojeView
        programaNome="Código 21"
        turmaCodigo="T-07"
        dia={7}
        duracao={21}
        faseNome="Forja"
        missao={{
          titulo: "Acordar às 5h e treinar 30 minutos",
          descricao: "Sem negociar com você mesmo. A constância vale mais que a intensidade.",
          pontos: 50,
        }}
        feito={false}
        pontosDia={0}
        posicao={7}
        streak={6}
        indice={82}
        pontosTotal={980}
        nivel="Implacável"
        podeOperar
        habitos={[
          { id: "1", nome: "Acordar cedo" },
          { id: "2", nome: "Treinar" },
          { id: "3", nome: "Ler 10 páginas" },
          { id: "4", nome: "Beber 3L de água" },
          { id: "5", nome: "Sem açúcar" },
        ]}
        cumpridos={["1", "2"]}
        missaoCompleta={false}
        publico={true}
      />
    </div>
  );
}
