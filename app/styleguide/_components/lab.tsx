"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/primitives";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { Medal } from "@/components/ui/medal";
import { BottomSheet, Dialog } from "@/components/ui/overlays";
import { MissionCard, RankingRow, StatCard } from "@/components/ui/cards";
import { useToast } from "@/components/ui/toast";

const reduce = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Demo({ title, desc, children, action }: { title: string; desc: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="font-display font-bold">{title}</p>
      <p className="mb-4 text-xs text-subtle">{desc}</p>
      <div className="flex min-h-[120px] items-center justify-center">{children}</div>
      <div className="mt-4">{action}</div>
    </div>
  );
}

// ---- Feedback triggers (Toast / Snackbar) ----
export function FeedbackTriggers() {
  const { show } = useToast();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variante="outline" fullWidth onClick={() => show({ message: "Feito. Mais um dia construído.", tone: "success" })}>
        Toast
      </Button>
      <Button
        variante="outline"
        fullWidth
        onClick={() => show({ message: "Post excluído.", actionLabel: "Desfazer", onAction: () => show({ message: "Restaurado." }) })}
      >
        Snackbar
      </Button>
    </div>
  );
}

// ---- Motion lab ----
export function MotionLab() {
  const { show } = useToast();
  const [checkin, setCheckin] = useState(0);
  const [progress, setProgress] = useState(0);
  const [streak, setStreak] = useState(6);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [play, setPlay] = useState(0);
  const medalRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLSpanElement>(null);
  const levelRef = useRef<HTMLSpanElement>(null);

  const bump = () => setPlay((p) => p + 1);

  const revealMedal = () => {
    bump();
    const el = medalRef.current;
    if (!el || reduce()) return;
    el.animate(
      [{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 800, easing: "cubic-bezier(0.34,1.2,0.64,1)" },
    );
  };

  const levelUp = () => {
    const el = levelRef.current;
    if (!el || reduce()) return;
    el.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 400, easing: "cubic-bezier(0.2,0,0,1)" });
  };

  const addStreak = () => {
    setStreak((s) => s + 1);
    const f = flameRef.current;
    if (f && !reduce()) f.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 200, easing: "cubic-bezier(0.34,1.2,0.64,1)" });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Demo title="Check-in" desc="Anel preenche + pontos contam · slow · standard" action={<Button onClick={() => setCheckin(checkin ? 0 : 78)}>Fazer check-in</Button>}>
          <ProgressRing value={checkin} center={<span>{Math.round(checkin)}</span>} playKey={checkin} />
        </Demo>

        <Demo title="Medalha" desc="Fade + scale + um brilho · ceremonial · celebrate" action={<Button variante="secondary" onClick={revealMedal}>Conquistar</Button>}>
          <div ref={medalRef} key={play}><Medal tier="ouro" size="lg" glow /></div>
        </Demo>

        <Demo title="Conquista" desc="Card entra suave · base · standard" action={<Button variante="secondary" onClick={bump}>Mostrar</Button>}>
          <div key={`c${play}`} className="w-full motion-safe:animate-[sheet-up_240ms_cubic-bezier(0.2,0,0,1)]">
            <StatCard valor="🏅 Constância" rotulo="conquista desbloqueada" />
          </div>
        </Demo>

        <Demo title="Evolução de nível" desc="Crossfade + identidade · slow" action={<Button variante="secondary" onClick={levelUp}>Subir de nível</Button>}>
          <span ref={levelRef} className="font-display text-2xl font-extrabold text-gold-bright">Implacável</span>
        </Demo>

        <Demo title="Streak" desc="+1 conta, chama dá bump · fast · celebrate" action={<Button variante="secondary" onClick={addStreak}>+1 dia</Button>}>
          <span className="flex items-center gap-2 font-display text-3xl font-extrabold">
            <span ref={flameRef} className="text-4xl">🔥</span>
            <span className="tabular-nums">{streak}</span>
          </span>
        </Demo>

        <Demo title="Progresso" desc="Preenche firme · slow · nunca quica" action={<Button variante="secondary" onClick={() => setProgress(progress ? 0 : 72)}>Avançar</Button>}>
          <div className="w-full"><ProgressBar value={progress} label={`${progress}% · evolução`} playKey={progress} /></div>
        </Demo>

        <Demo title="Bottom Sheet" desc="Sobe da base · base · standard" action={<Button variante="secondary" onClick={() => setSheet(true)}>Abrir sheet</Button>}>
          <span className="text-sm text-subtle">prioridade sobre modal</span>
        </Demo>

        <Demo title="Toast" desc="Confirmação efêmera · base" action={<Button variante="secondary" onClick={() => show({ message: "Registrado. Sua disciplina agradece.", tone: "success" })}>Disparar toast</Button>}>
          <span className="text-sm text-subtle">não bloqueante</span>
        </Demo>
      </div>

      <div className="mt-4">
        <Button variante="danger" onClick={() => setDialog(true)}>Abrir Dialog (decisão crítica)</Button>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Opções do post">
        <div className="flex flex-col gap-3">
          <Button variante="secondary" onClick={() => setSheet(false)}>Editar</Button>
          <Button variante="danger" onClick={() => setSheet(false)}>Excluir</Button>
          <Button variante="ghost" onClick={() => setSheet(false)}>Cancelar</Button>
        </div>
      </BottomSheet>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Cancelar matrícula?">
        <p className="mb-5 text-sm text-muted">Tem certeza? Essa ação encerra a jornada atual do guerreiro.</p>
        <div className="flex flex-col gap-3">
          <Button variante="danger" onClick={() => setDialog(false)}>Cancelar matrícula</Button>
          <Button variante="ghost" onClick={() => setDialog(false)}>Voltar</Button>
        </div>
      </Dialog>
    </>
  );
}

// ---- Static bottom nav (preview, não-fixo) ----
const NAV = [
  ["Hoje", "M3 11l9-8 9 8M5 10v10h14V10"],
  ["Jornada", "M3 4h18v17H3zM3 9h18M8 2v4M16 2v4"],
  ["Ranking", "M6 4h12v4a6 6 0 0 1-12 0V4zM12 14v4M8 21h8"],
  ["Feed", "M9 8a3 3 0 1 0 0-.01M3 20a6 6 0 0 1 12 0"],
  ["Perfil", "M12 8a4 4 0 1 0 0-.01M4 21a8 8 0 0 1 16 0"],
];
function StaticNav({ active = 0 }: { active?: number }) {
  return (
    <nav className="flex border-t border-border bg-ground/95" aria-label="Navegação (preview)">
      {NAV.map(([label, d], i) => (
        <span key={label} className={`flex flex-1 flex-col items-center gap-1 py-2 text-[0.62rem] ${i === active ? "text-gold" : "text-subtle"}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d as string} />
          </svg>
          {label}
        </span>
      ))}
    </nav>
  );
}

export { StaticNav };

// ---- Mobile Preview (device frames em largura real) ----
const DEVICES = [
  { key: "se", label: "iPhone SE", w: 375, h: 667 },
  { key: "i15", label: "iPhone 15", w: 393, h: 720 },
  { key: "i15pro", label: "15 Pro", w: 393, h: 720 },
  { key: "i15plus", label: "15 Plus", w: 430, h: 740 },
  { key: "s24", label: "Galaxy S24", w: 360, h: 720 },
  { key: "pixel9", label: "Pixel 9", w: 412, h: 740 },
];

export function MobilePreview() {
  const [dev, setDev] = useState(DEVICES[1]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {DEVICES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDev(d)}
            aria-pressed={d.key === dev.key}
            className={`inline-flex min-h-[38px] items-center rounded-full border px-3.5 text-sm transition-colors duration-fast ${
              d.key === dev.key ? "border-gold bg-gold/10 text-gold-bright" : "border-border text-muted hover:text-gold"
            }`}
          >
            {d.label} · {d.w}px
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div
          className="mx-auto flex flex-col overflow-hidden rounded-[2rem] border-4 border-border bg-ground shadow-overlay"
          style={{ width: dev.w, height: dev.h }}
        >
          {/* top bar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="font-display text-xs font-bold uppercase tracking-[0.28em] text-gold">Código 21</span>
            <span className="grid size-8 place-items-center rounded-full border border-border text-xs text-gold">DA</span>
          </div>
          {/* content */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
            <p className="h-section">Hoje</p>
            <MissionCard pontos={50} titulo="Acordar às 5h e treinar 30 min" descricao="Sua missão de hoje espera." />
            <div className="grid grid-cols-2 gap-3">
              <StatCard valor="🔥 6" rotulo="Presença" />
              <StatCard valor="82%" rotulo="Disciplina" />
            </div>
            <RankingRow posicao={7} nome="Você" valor={980} ehVoce />
          </div>
          <StaticNav active={0} />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-subtle">{dev.label} · {dev.w}×{dev.h} (largura real)</p>
    </div>
  );
}
