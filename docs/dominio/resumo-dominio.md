# Código 21 — Resumo do Domínio

> **Grafo CONCEITUAL do domínio (modelo de negócio + regras aprovadas), NÃO um grafo técnico de
> código.** Derivado das **migrations 0001–0008**, das funções/policies SQL, das páginas da Jornada
> (FASE 4) e das decisões aprovadas bloco a bloco. Estado: **BLOCO JORNADA implementado e
> homologado.** Fonte canônica: `dominio-codigo21.md`. Artefatos navegáveis: `graph.html`
> (interativo), `graph.json`, `GRAPH_REPORT.md`.
>
> Convenção deste documento: **cada fato é descrito uma única vez**. Entidades = inventário ·
> Relacionamentos = cardinalidade estrutural · Mecânicas = como a Jornada funciona (implementação) ·
> Fluxos/Acesso = estados · **Regras críticas = invariantes de negócio (fonte única)** · Riscos =
> riscos.

## Entidades (58 nós · 6 comunidades + estados)
- **Estrutura do Programa & Identidade:** Temporada, Programa, Turma, User, Auth, Guerreiro, Hábito,
  Missão, Missão do dia, Índice de Disciplina.
- **Matrícula, Acesso & Aquisição:** Matrícula, Entitlement, Origem de Acesso, Compra, Webhook de
  pagamento, Claim por e-mail, Concessão Manual, Reembolso, Transferência, Jornada.
- **Scoring Engine & Ranking:** Scoring Engine, Trigger de Check-in, Pontuação, Pontuação Agregada,
  Streak (Presença), Ranking Views (`ranking_geral`/`ranking_semanal`/`ranking_presenca`), Página
  Ranking.
- **Check-in & Estados de Matrícula:** Check-in diário, Dia Corrente da Turma, Idempotência,
  Matrícula ativa/concluida/cancelada.
- **Encerramento, Legado & Cron:** Cron de Encerramento, Rota de Cron, Botão Admin Fallback,
  Encerramento da turma, Certificado, Guerreiro Formado, Guerreiro Implacável, Hall dos Guerreiros,
  Nível, Regra do Nível Monotônico, `disciplina_final`, Auditoria, RLS.
- **Estados de Turma:** agendada, contagem, ativa, encerrada, arquivada.

## Relacionamentos (cardinalidade estrutural)
- Temporada **1—N** Programa · Programa **1—N** Turma · Programa **1—N** Hábito · Programa
  **1—(até duração)** Missão.
- Turma **1—N** Matrícula · User **1—1** Guerreiro · Matrícula **N—1** User / Turma / Entitlement.
- **Entitlement N—1 Programa** (o direito é do PROGRAMA) · Entitlement →(opcional) Turma pretendida.
- Matrícula percorre Jornada **1—N** Check-in · Check-in **1—N** Hábito · Check-in **1—1** Missão do
  dia.
- Encerramento da turma **1—N** Certificado / Hall dos Guerreiros (uma entrada por matrícula concluída).

> O *comportamento* dessas relações (o que o Scoring e o Encerramento fazem) está em **Mecânicas da
> Jornada**; as *invariantes* estão em **Regras críticas**.

## Mecânicas da Jornada (como funciona — implementação)
- **Check-in** (`recalc_checkin`): registra Hábitos (10 inegociáveis) e Missão do dia; dispara o
  Scoring via triggers `trg_after_checkin`/`trg_after_checkin_habito` (guarda `pg_trigger_depth`).
- **Scoring Engine** (`recalc_pontuacao`): grava Pontuação Agregada com Pontuação, Streak, Índice e
  Nível.
- **Índice de Disciplina** (`calcular_indice`): 0–100, pesos **60/25/15** (Hábitos / Missões / Dias
  Perfeitos) sobre os dias já iniciados.
- **Nível**: Recruta → Sobrevivente (≥50% e ≥4 check-ins) → Guerreiro (≥80% e ≥8 check-ins) →
  Guerreiro Formado (na conclusão). `nivel_rank` ordena.
- **Ranking Views** (`security_invoker = true`, isoladas por turma): `ranking_geral` (pontos),
  `ranking_semanal` (pontos da semana), `ranking_presenca` (streak).
- **Encerramento** (`encerrar_turma`, migration 0008): **atômico, idempotente e auditado**; conclui as
  matrículas ativas, **congela `disciplina_final` + Nível**, emite Certificado, concede Guerreiro
  Formado (e Guerreiro Implacável se 21 check-ins + 21 dias perfeitos), monta o Hall e registra
  `audit_log`.
- **Disparo do Encerramento**: **Cron de Encerramento** (Vercel → `/api/cron/encerrar-turmas`,
  protegido por `Authorization: Bearer CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`) para turmas com
  janela vencida; **Botão Admin Fallback** para encerramento manual.
- **`disciplina_final`**: o Índice congelado no encerramento, exibido em Certificado, Hall e Perfil.

## Fluxos de estado
- **Matrícula:** `ativa → concluida` (encerramento) · `ativa → cancelada` (cancelar/reembolso) ·
  `cancelada → ativa` (transição existe; condição em Regras críticas). `concluida` é terminal.
- **Turma:** `agendada → contagem → ativa → encerrada → arquivada`.
- **Entitlement:** `pendente → ativo → reembolsado` (`cancelado` previsto no enum, sem fluxo no MVP).

## Acesso por status da matrícula
- **ativa:** operação + área da turma + histórico próprio.
- **concluida:** área da turma (leitura) + histórico próprio (sem operação).
- **cancelada:** sem operação/área como membro + **histórico próprio visível** (dados preservados).

## Regras críticas (invariantes de negócio — fonte única)
1. Programa é o produto; Turma é só alocação.
2. Claim por e-mail **nunca** reativa matrícula cancelada.
3. Reativação **somente administrativa** (`cancelada → ativa`).
4. Transferência altera **apenas `turma_id`**, **só no mesmo programa**, só matrícula ativa.
5. Matrícula **concluída nunca reativa**; recompra gera **nova matrícula em nova turma**.
6. **Histórico sempre preservado.** **1 matrícula ativa por programa.**
7. **Nível é monotônico** — nunca regride durante a turma.
8. Check-in **só no dia corrente**, sem retroativo, **idempotente** por `(matricula_id, dia_numero)`.
9. **Streak = presença**: zera ao faltar, **sem eliminação** nem perda de pontos/acesso.
10. Encerramento é **idempotente** e o cron é **autorizado** (Bearer + service role).
11. Toda ação administrativa é **auditada** (`audit_log` via SECURITY DEFINER gated em `is_admin`).

## Riscos
- **God nodes / convergência:** Encerramento da turma, Matrícula, Entitlement, Check-in, Scoring
  Engine, Ranking Views — quebra de semântica neles afeta todo o sistema.
- **Atomicidade do Encerramento**: validada por construção/transação única, mas **falha forçada no meio
  ainda não testada** (pendência obrigatória de produção).
- **Scoring/Triggers**: regressão silenciosa nos triggers afeta índice/nível/ranking.
- **Ranking em escala** (views recalculadas) — reavaliar materialização com volume.
- **Fuso/virada do dia** define o zeramento do streak — validar em produção.
- **Helpers status-aware** precisam ser usados em toda escrita nova (esquecer reabre acesso indevido).
- **Auditoria por chamada** (não trigger) — uma action nova pode esquecer de auditar.
- **LGPD × acesso permanente/Hall** (esquecimento vs. legado público).
