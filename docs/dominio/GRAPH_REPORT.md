# Graph Report - .  (2026-06-23)

## Corpus Check
- Corpus is ~716 words - fits in a single context window. You may not need a graph.

## Summary
- 58 nodes · 65 edges · 13 communities (5 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Encerramento, Legado & Cron|Encerramento, Legado & Cron]]
- [[_COMMUNITY_Matrícula, Acesso & Aquisição|Matrícula, Acesso & Aquisição]]
- [[_COMMUNITY_Scoring Engine & Ranking|Scoring Engine & Ranking]]
- [[_COMMUNITY_Estrutura do Programa & Identidade|Estrutura do Programa & Identidade]]
- [[_COMMUNITY_Check-in & Estados de Matrícula|Check-in & Estados de Matrícula]]
- [[_COMMUNITY_Estados de Turma|Estados de Turma]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]
- [[_COMMUNITY_Estados (detalhe)|Estados (detalhe)]]

## God Nodes (most connected - your core abstractions)
1. `Encerramento da turma` - 10 edges
2. `Turma` - 7 edges
3. `Entitlement` - 7 edges
4. `Matrícula` - 6 edges
5. `Check-in diário` - 6 edges
6. `Scoring Engine` - 6 edges
7. `Programa` - 5 edges
8. `Ranking Views` - 5 edges
9. `Índice de Disciplina` - 4 edges
10. `Nível` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Entitlement` --grants_access_to--> `Programa`  [EXTRACTED]
  dominio-codigo21.md → dominio-codigo21.md  _Bridges community 3 → community 1_
- `Hall dos Guerreiros` --stores_per--> `Turma`  [EXTRACTED]
  dominio-codigo21.md → dominio-codigo21.md  _Bridges community 1 → community 0_
- `Ranking Views` --isolated_by--> `Turma`  [EXTRACTED]
  dominio-codigo21.md → dominio-codigo21.md  _Bridges community 1 → community 2_
- `Jornada` --accumulates--> `Check-in diário`  [EXTRACTED]
  dominio-codigo21.md → dominio-codigo21.md  _Bridges community 1 → community 4_
- `Check-in diário` --registers--> `Hábito`  [EXTRACTED]
  dominio-codigo21.md → dominio-codigo21.md  _Bridges community 4 → community 3_

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Saídas do Encerramento da Turma** — dominio_codigo21_encerramento_da_turma, dominio_codigo21_certificado, dominio_codigo21_hall_dos_guerreiros, dominio_codigo21_guerreiro_implacavel, dominio_codigo21_auditoria [EXTRACTED 1.00]
- **Saídas do Scoring Engine** — dominio_codigo21_scoring_engine, dominio_codigo21_indice_de_disciplina, dominio_codigo21_streak_presenca, dominio_codigo21_nivel, dominio_codigo21_pontuacao [EXTRACTED 1.00]

## Communities (13 total, 8 thin omitted)

### Community 0 - "Encerramento, Legado & Cron"
Cohesion: 0.19
Nodes (13): Auditoria, Botão Admin Fallback, Certificado, Cron de Encerramento, disciplina_final, Encerramento da turma, Guerreiro Formado, Guerreiro Implacável (+5 more)

### Community 1 - "Matrícula, Acesso & Aquisição"
Cohesion: 0.22
Nodes (11): Claim por e-mail, Compra, Concessão Manual, Entitlement, Jornada, Matrícula, Origem de Acesso, Reembolso (+3 more)

### Community 2 - "Scoring Engine & Ranking"
Cohesion: 0.22
Nodes (10): Página Ranking, Pontuação, Pontuação Agregada, ranking_geral, ranking_presenca, ranking_semanal, Ranking Views, Scoring Engine (+2 more)

### Community 3 - "Estrutura do Programa & Identidade"
Cohesion: 0.25
Nodes (9): Auth, Guerreiro, Hábito, Índice de Disciplina, Missão, Missão do dia, Programa, Temporada (+1 more)

### Community 4 - "Check-in & Estados de Matrícula"
Cohesion: 0.33
Nodes (6): Check-in diário, Dia Corrente da Turma, Idempotência, Matrícula ativa, Matrícula cancelada, Matrícula concluida

## Knowledge Gaps
- **23 isolated node(s):** `Auth`, `Origem de Acesso`, `Compra`, `Concessão Manual`, `Reembolso` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Turma` connect `Matrícula, Acesso & Aquisição` to `Encerramento, Legado & Cron`, `Scoring Engine & Ranking`, `Estrutura do Programa & Identidade`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Why does `Encerramento da turma` connect `Encerramento, Legado & Cron` to `Check-in & Estados de Matrícula`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `Entitlement` connect `Matrícula, Acesso & Aquisição` to `Estrutura do Programa & Identidade`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `Auth`, `Origem de Acesso`, `Compra` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._