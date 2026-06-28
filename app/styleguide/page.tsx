import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast";
import { Button, Badge, Card, Divider, Eyebrow, Tag } from "@/components/ui/primitives";
import { DateInput, OTPInput, PasswordInput, SearchInput, Select, Textarea, TextInput } from "@/components/ui/fields";
import { Checkbox, Toggle } from "@/components/ui/controls";
import { AchievementCard, ContentCard, EmptyState, MissionCard, ProfileCard, RankingRow, StatCard } from "@/components/ui/cards";
import { Medal } from "@/components/ui/medal";
import { Alert, Banner } from "@/components/ui/alert";
import { Skeleton, SkeletonCard, Spinner } from "@/components/ui/loading";
import { Chip, Segmented, Tabs } from "@/components/ui/tabs";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { FAB } from "@/components/ui/fab";
import { Timeline } from "@/components/ui/timeline";
import { FeedbackTriggers, MobilePreview, MotionLab, StaticNav } from "./_components/lab";

/**
 * /styleguide — laboratório visual oficial (ver docs/DESIGN-SYSTEM.md).
 * Admin-only em produção. Em desenvolvimento fica aberto para validação local.
 * NÃO é uma tela de produto: sem lógica de negócio, sem jornada, sem dados reais.
 */
async function gateProducao() {
  if (process.env.NODE_ENV !== "production") return;
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: ehAdmin } = await sb.rpc("is_admin");
  if (!ehAdmin) redirect("/perfil");
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-12">
      <Eyebrow>{n}</Eyebrow>
      <h2 className="h-section mb-1 mt-1">{title}</h2>
      <Divider className="mb-6" />
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

const H3 = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs uppercase tracking-wider text-subtle">{children}</p>
);

const COLORS: [string, string][] = [
  ["ground", "bg-ground"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["border", "bg-border"],
  ["text", "bg-text"],
  ["muted", "bg-muted"],
  ["subtle", "bg-subtle"],
  ["gold", "bg-gold"],
  ["gold-strong", "bg-gold-strong"],
  ["gold-bright", "bg-gold-bright"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
];
const SPACES: [string, string][] = [
  ["2xs", "size-1"],
  ["xs", "size-2"],
  ["sm", "size-3"],
  ["md", "size-4"],
  ["lg", "size-6"],
  ["xl", "size-8"],
  ["2xl", "size-12"],
];
const RADII: [string, string][] = [
  ["md", "rounded-md"],
  ["lg", "rounded-lg"],
  ["xl", "rounded-xl"],
  ["2xl", "rounded-2xl"],
  ["full", "rounded-full"],
];

export default async function StyleguidePage() {
  await gateProducao();

  return (
    <ToastProvider>
      <div className="mx-auto max-w-3xl px-5 pb-32 pt-14">
        <Eyebrow>Design System · Código 21</Eyebrow>
        <h1 className="h-display mt-2">Styleguide</h1>
        <p className="mt-3 text-fluid-lead text-muted">
          Laboratório visual oficial. Toda tela futura usa só estes componentes. Referência:{" "}
          <span className="text-gold">docs/DESIGN-SYSTEM.md</span>.
        </p>
        <p className="mt-2 text-xs text-subtle">
          Admin-only em produção · aberto em desenvolvimento. Sem lógica de negócio.
        </p>

        {/* 1 · FOUNDATIONS */}
        <Section n="01" title="Foundations">
          <H3>Paleta / tokens de cor</H3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {COLORS.map(([name, cls]) => (
              <div key={name} className="overflow-hidden rounded-xl border border-border">
                <div className={`h-12 ${cls}`} />
                <p className="bg-surface px-2 py-1.5 text-[0.66rem] text-muted">{name}</p>
              </div>
            ))}
          </div>

          <H3>Tipografia / escalas</H3>
          <Card className="flex flex-col gap-2">
            <p className="h-display">Disciplina é liberdade</p>
            <p className="h-section">Seção — Dia 7</p>
            <p className="h-card">Título de card</p>
            <p className="text-fluid-lead text-muted">Lead — o que motiva vem primeiro.</p>
            <p className="text-base">Corpo padrão (16px mínimo no mobile).</p>
            <p className="text-sm text-subtle">Detalhe secundário (subtle).</p>
          </Card>

          <H3>Espaçamento (base 4px)</H3>
          <div className="flex items-end gap-3">
            {SPACES.map(([name, cls]) => (
              <div key={name} className="text-center">
                <div className={`${cls} rounded bg-gold-strong`} />
                <p className="mt-1 text-[0.6rem] text-subtle">{name}</p>
              </div>
            ))}
          </div>

          <H3>Border radius</H3>
          <div className="flex flex-wrap gap-3">
            {RADII.map(([name, cls]) => (
              <div key={name} className="text-center">
                <div className={`size-14 border border-border bg-surface-raised ${cls}`} />
                <p className="mt-1 text-[0.6rem] text-subtle">{name}</p>
              </div>
            ))}
          </div>

          <H3>Sombras / elevação</H3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm">e1 · surface + borda</div>
            <div className="rounded-2xl border border-border bg-surface-raised p-4 text-sm shadow-pop">e2 · raised + shadow-pop</div>
            <div className="rounded-2xl border border-border bg-surface-raised p-4 text-sm shadow-overlay">e3 · overlay + shadow-overlay</div>
            <div className="rounded-2xl border border-gold/40 bg-surface p-4 text-sm shadow-glow-gold">glow-gold (ativo)</div>
          </div>

          <H3>Grid & safe area</H3>
          <Card>
            <p className="text-sm text-muted">
              Coluna única <span className="text-text">max-w-screen-sm</span>, gutters{" "}
              <span className="text-text">px-5</span>, alvo de toque <span className="text-text">≥48px (min-h-tap)</span>.
              Safe area: header <span className="text-text">env(safe-area-inset-top)</span>, fixos inferiores{" "}
              <span className="text-text">env(safe-area-inset-bottom)</span>.
            </p>
          </Card>
        </Section>

        {/* 2 · BUTTONS */}
        <Section n="02" title="Buttons">
          <H3>Variantes</H3>
          <div className="flex flex-col gap-3">
            <Button variante="primary">Primary — Fazer check-in</Button>
            <Button variante="secondary">Secondary — Revisar</Button>
            <Button variante="outline">Outline — Ver protocolo</Button>
            <Button variante="ghost">Ghost — Sair da conta</Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variante="danger" fullWidth>Danger</Button>
              <Button variante="success" fullWidth>Success</Button>
            </div>
          </div>
          <H3>Estados</H3>
          <div className="grid grid-cols-2 gap-3">
            <Button variante="primary" loading>Salvando…</Button>
            <Button variante="primary" disabled>Disabled</Button>
          </div>
          <p className="text-xs text-subtle">hover/pressed são interativos (passe o cursor / toque).</p>
        </Section>

        {/* 3 · INPUTS */}
        <Section n="03" title="Inputs">
          <TextInput label="Input — E-mail" type="email" inputMode="email" placeholder="voce@exemplo.com" />
          <SearchInput placeholder="Buscar guerreiro…" />
          <PasswordInput hint="Mínimo de 6 caracteres." />
          <Textarea label="Textarea — Bio" placeholder="Compartilhe algo com a sua turma…" />
          <Select label="Select — Estado civil" defaultValue="">
            <option value="" disabled>Selecione…</option>
            <option>Solteiro</option>
            <option>Casado</option>
          </Select>
          <DateInput label="Date — Nascimento" />
          <OTPInput label="OTP — Código de acesso" />
          <Divider label="Checkbox & Toggle" />
          <Checkbox label="Acordar às 5h" hint="um dos inegociáveis" defaultChecked />
          <Checkbox label="Ler 10 páginas" />
          <Toggle label="Check-in público" defaultChecked />
          <Divider label="Estados" />
          <TextInput label="Error" state="error" hint="E-mail inválido. Confira e tente de novo." defaultValue="email@" />
          <TextInput label="Success" state="success" hint="Tudo certo." defaultValue="voce@exemplo.com" />
          <TextInput label="Disabled" state="disabled" defaultValue="bloqueado" />
        </Section>

        {/* 4 · CARDS */}
        <Section n="04" title="Cards">
          <MissionCard pontos={50} titulo="Acordar às 5h e treinar 30 min" descricao="A descrição secundária fica abaixo, sem competir com a ação." />
          <H3>Ranking (linha — sem tabela)</H3>
          <RankingRow posicao={1} nome="João S." valor={1240} />
          <RankingRow posicao={2} nome="Marina" valor={1180} />
          <RankingRow posicao={7} nome="Você" valor={980} ehVoce />
          <H3>Estatística (2-up)</H3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard valor="🔥 6" rotulo="Presença (dias)" />
            <StatCard valor="82%" rotulo="Disciplina" />
          </div>
          <H3>Perfil</H3>
          <ProfileCard nome="Danilo · Guerreiro" nivel="Implacável" evolucao={82} />
          <H3>Conquista</H3>
          <AchievementCard nome="Constância de Ferro" data="28/06" tier="ouro" />
          <AchievementCard nome="Próxima conquista" tier="prata" locked />
          <H3>Conteúdo</H3>
          <ContentCard titulo="Execução do dia">Faça o aquecimento, depois 3 blocos de 8 minutos. Hidrate-se.</ContentCard>
          <H3>Estado vazio</H3>
          <EmptyState>A primeira conquista está a um check-in de distância.</EmptyState>
        </Section>

        {/* 5 · NAVIGATION */}
        <Section n="05" title="Navigation">
          <H3>Bottom Navigation (preview estático)</H3>
          <div className="overflow-hidden rounded-2xl border border-border">
            <StaticNav active={0} />
          </div>
          <H3>Tabs</H3>
          <Tabs tabs={[{ key: "g", label: "Geral" }, { key: "s", label: "Semanal" }, { key: "p", label: "Presença" }]} />
          <H3>Segmented Control</H3>
          <Segmented options={[{ key: "w", label: "Semana" }, { key: "m", label: "Mês" }, { key: "t", label: "Tudo" }]} />
          <H3>Chips</H3>
          <div className="flex flex-wrap gap-2">
            <Chip selected>Geral</Chip>
            <Chip>Semanal</Chip>
            <Chip>Presença</Chip>
          </div>
          <H3>Tags (estático) & Badges</H3>
          <div className="flex flex-wrap items-center gap-2">
            <Tag>Fase 2</Tag>
            <Tag tone="warning">Oculto</Tag>
            <Tag tone="success">Concluído</Tag>
            <Tag tone="danger">Perdido</Tag>
            <span className="ml-2 inline-flex items-center gap-2">
              <Badge>3</Badge>
              <Badge tone="neutral">novo</Badge>
            </span>
          </div>
          <H3>FAB (flutua no canto inferior direito) →</H3>
        </Section>

        {/* 6 · FEEDBACK */}
        <Section n="06" title="Feedback">
          <H3>Toast / Snackbar</H3>
          <FeedbackTriggers />
          <H3>Alertas</H3>
          <Alert tone="info">Informação neutra ao guerreiro.</Alert>
          <Alert tone="warning">Você ainda não fez o check-in de hoje.</Alert>
          <Alert tone="danger">Não conseguimos salvar agora. Seu progresso está seguro.</Alert>
          <Alert tone="success">Feito. Mais um dia construído.</Alert>
          <H3>Banner</H3>
          <Banner action={<Button variante="ghost" fullWidth={false}>Reconectar</Button>}>Sem conexão. Já voltamos.</Banner>
        </Section>

        {/* 7 · PROGRESS */}
        <Section n="07" title="Progress">
          <H3>Progress Bar</H3>
          <ProgressBar value={72} label="Dia 7 de 21" />
          <H3>Progress Ring</H3>
          <div className="flex items-center gap-6">
            <ProgressRing value={78} center={<span>78</span>} />
            <ProgressRing value={100} size={96} />
          </div>
          <H3>Skeleton</H3>
          <SkeletonCard />
          <Skeleton className="w-1/2" />
          <H3>Loading</H3>
          <Spinner label="Preparando sua jornada…" />
        </Section>

        {/* 8 · MEDALHAS */}
        <Section n="08" title="Medalhas">
          <div className="flex flex-wrap items-end gap-5">
            <div className="text-center"><Medal tier="bronze" /><p className="mt-2 text-xs text-subtle">Bronze</p></div>
            <div className="text-center"><Medal tier="prata" /><p className="mt-2 text-xs text-subtle">Prata</p></div>
            <div className="text-center"><Medal tier="ouro" glow /><p className="mt-2 text-xs text-subtle">Ouro (glow)</p></div>
            <div className="text-center"><Medal tier="ouro" locked /><p className="mt-2 text-xs text-subtle">Bloqueada</p></div>
          </div>
          <p className="text-xs text-subtle">A animação de conquista (cerimonial) está na seção Motion.</p>
        </Section>

        {/* 9 · MOTION */}
        <Section n="09" title="Motion">
          <MotionLab />
        </Section>

        {/* 10 · MOBILE PREVIEW */}
        <Section n="10" title="Mobile Preview">
          <p className="text-sm text-muted">Validação em larguras reais antes de implementar as telas.</p>
          <MobilePreview />
        </Section>

        <H3>Timeline (Jornada)</H3>
        <Timeline
          items={[
            { estado: "concluido", titulo: "Dia 5 · concluído" },
            { estado: "perdido", titulo: "Dia 6 · perdido — acontece. Siga." },
            { estado: "hoje", titulo: <b>Dia 7 · Hoje — sua missão espera.</b> },
            { estado: "bloqueado", titulo: "Dia 8 · bloqueado" },
          ]}
        />
      </div>

      <FAB label="Novo post" />
    </ToastProvider>
  );
}
