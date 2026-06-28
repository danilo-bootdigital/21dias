import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Medal, type MedalTier } from "@/components/ui/medal";
import { Card, Eyebrow } from "@/components/ui/primitives";

/**
 * Cards do Design System (ver DESIGN-SYSTEM.md). Presentational, sem dados reais.
 * Tipos: Missão · Ranking (linha) · Estatística · Perfil · Conquista · Conteúdo · Vazio.
 */

export function MissionCard({
  pontos,
  titulo,
  descricao,
}: {
  pontos: number;
  titulo: string;
  descricao?: string;
}) {
  return (
    <Card className="border-gold/30 bg-gold/5">
      <Eyebrow className="!text-gold">Missão do dia · +{pontos}</Eyebrow>
      <p className="h-card mt-1">{titulo}</p>
      {descricao ? <p className="mt-1.5 text-sm text-muted">{descricao}</p> : null}
    </Card>
  );
}

export function RankingRow({
  posicao,
  nome,
  foto,
  valor,
  ehVoce = false,
  medalha = false,
  comAvatar = true,
}: {
  posicao: number;
  /** Nome do Guerreiro (regra: lib/identity.ts). Ausente → fallback "Guerreiro". */
  nome?: string;
  foto?: string | null;
  valor: number | string;
  ehVoce?: boolean;
  /** Destaca o pódio (1–3) com medalha no lugar do número. */
  medalha?: boolean;
  /** Exibe avatar quando há nome/foto. Desligue para preservar layouts sem avatar. */
  comAvatar?: boolean;
}) {
  const podio = posicao <= 3;
  const tier: MedalTier = posicao === 1 ? "ouro" : posicao === 2 ? "prata" : "bronze";
  const rotulo = ehVoce ? "Você" : (nome ?? "Guerreiro");
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
        ehVoce ? "border-gold bg-gold/[0.07]" : "border-border bg-surface"
      }`}
    >
      {medalha && podio ? (
        <Medal tier={tier} size="sm" glow={posicao === 1} />
      ) : (
        <span className={`w-7 text-center font-display font-bold tabular-nums ${podio ? "text-gold-bright" : "text-subtle"}`}>
          {posicao}
        </span>
      )}
      {comAvatar && (nome || foto) ? <Avatar src={foto} nome={nome} size={30} /> : null}
      <span className={`flex-1 truncate text-sm ${ehVoce ? "font-semibold text-gold-bright" : ""}`}>{rotulo}</span>
      <span className="font-semibold tabular-nums text-muted">{valor}</span>
    </div>
  );
}

export function StatCard({ valor, rotulo }: { valor: ReactNode; rotulo: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="font-display text-2xl font-extrabold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-subtle">{rotulo}</p>
    </div>
  );
}

export function ProfileCard({
  nome,
  foto,
  nivel,
  evolucao,
}: {
  nome: string;
  foto?: string | null;
  nivel: string;
  evolucao: number;
}) {
  return (
    <Card className="flex items-center gap-4">
      <Avatar src={foto} nome={nome} size={64} />
      <div className="min-w-0 flex-1">
        <p className="h-card truncate">{nome}</p>
        <p className="mt-0.5 text-sm text-subtle">
          {nivel} · <span className="tabular-nums text-muted">{evolucao}%</span> de evolução
        </p>
      </div>
      <Medal tier="ouro" size="sm" glow />
    </Card>
  );
}

export function AchievementCard({
  nome,
  data,
  tier = "ouro",
  locked = false,
}: {
  nome: string;
  data?: string;
  tier?: MedalTier;
  locked?: boolean;
}) {
  return (
    <Card className={`flex items-center gap-4 ${locked ? "opacity-70" : ""}`}>
      <Medal tier={tier} size="md" locked={locked} glow={!locked} />
      <div className="min-w-0">
        <p className="h-card truncate text-base">{nome}</p>
        <p className="mt-0.5 text-xs text-subtle">{locked ? "bloqueada" : `conquistada · ${data}`}</p>
      </div>
    </Card>
  );
}

export function ContentCard({
  titulo,
  children,
}: {
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      {titulo ? <p className="mb-1 font-medium text-text">{titulo}</p> : null}
      <div className="whitespace-pre-line text-sm text-muted">{children}</div>
    </Card>
  );
}

export function EmptyState({
  titulo,
  children,
  acao,
}: {
  titulo?: string;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-center">
      {titulo ? <p className="h-card mb-1">{titulo}</p> : null}
      <p className="text-sm text-muted">{children}</p>
      {acao ? <div className="mt-5 flex justify-center">{acao}</div> : null}
    </div>
  );
}
