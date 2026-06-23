# Código 21 — Domínio (fonte canônica do grafo conceitual)

> Modelo de negócio + regras aprovadas, derivado das **migrations 0001–0008**, das funções/policies
> SQL, das páginas da Jornada (FASE 4) e das decisões aprovadas bloco a bloco. Estado: **BLOCO
> JORNADA implementado e homologado**.

## Estrutura do programa

Temporada contem_1_N Programa. Programa contem_1_N Turma. Programa define_1_N Hábito. Programa
define_1_ate_duracao Missão. Programa é_o_PRODUTO_vendido. Turma é_apenas_alocação. Turma agrupa_1_N
Matrícula. Temporada agrega_histórico_multi_temporada Guerreiro.

## Identidade e matrícula

User (domínio) referencia_auth_user_id Auth. User possui_1_1 Guerreiro (perfil). Matrícula pertence_N_1
User. Matrícula pertence_N_1 Turma. Matrícula referencia_N_1 Entitlement. Guerreiro acumula
melhor_temporada, melhor_turma, melhor_posicao, maior_streak.

## Acesso e entitlement

Entitlement concede_acesso_a_N_1 Programa (o direito é do PROGRAMA, não da turma). Entitlement
aponta_turma_pretendida_opcional Turma. Entitlement tem Origem de Acesso (compra, cortesia, convite,
offline, interno, teste). Compra dispara Webhook de pagamento. Webhook de pagamento cria
Entitlement. Claim por e-mail vincula Entitlement ao User e gera Matrícula. Concessão Manual (admin)
cria Entitlement sem compra. Reembolso revoga Matrícula.

## Jornada e check-in

Matrícula percorre Jornada (duracao_dias). Jornada acumula_1_N Check-in diário. Check-in diário
registra Hábito (10 inegociáveis). Check-in diário registra Missão do dia. Check-in diário só_é_aceito
em Matrícula ativa. Check-in diário usa_sempre Dia Corrente da Turma (sem backfill, sem retroativo).
Dia Corrente da Turma é_calculado_por dia_corrente_turma (timezone da turma). Check-in diário é
idempotente_por matricula_id_e_dia_numero.

## Scoring Engine (motor de pontuação)

Scoring Engine é_implementado_em recalc_pontuacao e recalc_checkin (migration 0006). Scoring Engine é
disparado_por Trigger de Check-in (trg_after_checkin, trg_after_checkin_habito). Trigger de Check-in
evita_recursão com pg_trigger_depth. Scoring Engine calcula Pontuação (Execução). Scoring Engine
calcula Índice de Disciplina. Scoring Engine calcula Streak (Presença). Scoring Engine calcula Nível.
Scoring Engine grava Pontuação Agregada (pontuacao_agregada).

Índice de Disciplina pondera Hábitos_60, Missões_25 e Dias_Perfeitos_15. Índice de Disciplina é
calculado_por calcular_indice sobre dias iniciados. Streak (Presença) significa_presença: zera ao
faltar, sem eliminação e sem perda de pontos ou acesso. Nível é_monotônico: nunca regride na turma.
Nível progride Recruta, Sobrevivente (≥50% e ≥4 check-ins), Guerreiro (≥80% e ≥8 check-ins),
Guerreiro Formado (conclusão). nivel_rank ordena Nível.

## Ranking (views)

Ranking Views expõe ranking_geral, ranking_semanal e ranking_presenca (migration 0007). Ranking Views
usa security_invoker_true (respeita RLS do chamador). ranking_geral ordena_por Pontuação (Execução).
ranking_semanal ordena_por pontos_da_semana. ranking_presenca ordena_por Streak (Presença). Ranking
Views é_isolada_por Turma. Página Ranking consome Ranking Views.

## Encerramento e legado

Cron de Encerramento (Vercel Cron) chama a rota /api/cron/encerrar-turmas. Rota de Cron é_protegida_por
Authorization Bearer CRON_SECRET (timingSafeEqual). Rota de Cron usa SUPABASE_SERVICE_ROLE_KEY. Rota de
Cron seleciona Turma elegível (janela vencida) e chama Encerramento da turma. Botão Admin Fallback
também chama Encerramento da turma manualmente.

Encerramento da turma é_implementado_em encerrar_turma (migration 0008). Encerramento da turma é
atômico, idempotente e auditado. Encerramento da turma conclui Matrícula ativa (vira concluida).
Encerramento da turma congela disciplina_final e Nível. Encerramento da turma emite Certificado.
Encerramento da turma concede Guerreiro Formado. Encerramento da turma concede Guerreiro Implacável
quando 21_check_ins_e_21_dias_perfeitos. Encerramento da turma monta Hall dos Guerreiros (hall_entries
por ranking). Encerramento da turma registra Auditoria (audit_log, actor sistema ou admin).

Certificado guarda nivel_final e disciplina_final. Hall dos Guerreiros guarda posicao, nivel_final e
disciplina_final por Turma. Guerreiro Implacável é a conquista mais rara. disciplina_final é o Índice
de Disciplina congelado no encerramento, exibido em Certificado, Hall dos Guerreiros e Perfil.

## Estados

Matrícula: ativa, concluida, cancelada. Matrícula ativa transita_para concluida no Encerramento.
Matrícula ativa transita_para cancelada em cancelamento ou Reembolso. Matrícula cancelada transita_para
ativa somente_por admin. Matrícula concluida nunca_reativa.

Turma: agendada, contagem, ativa, encerrada, arquivada. Turma ativa transita_para encerrada no
Encerramento. Entitlement: pendente, ativo, reembolsado, cancelado.

## Acesso por status da matrícula

Matrícula ativa permite operação, área da turma e histórico próprio. Matrícula concluida permite área
da turma em leitura e histórico próprio sem operação. Matrícula cancelada não_permite operação nem área
da turma, mas mantém histórico próprio visível.

## Segurança e auditoria

RLS está habilitada nas 27 tabelas. Helpers SECURITY DEFINER fixam search_path. current_user_id resolve
o User de domínio. is_admin e is_staff_turma controlam papéis. Helpers status-aware separam operação
(ativa), histórico (ativa+concluida) e cancelada (só histórico próprio). Auditoria (audit_log) é
registrada por chamada via função SECURITY DEFINER gated em is_admin.

## Regras críticas

Programa é o produto; Turma é só alocação. Claim por e-mail nunca reativa Matrícula cancelada.
Reativação só admin (cancelada→ativa). Transferência altera apenas turma_id. Transferência só no mesmo
programa. Matrícula concluida nunca reativa. Recompra após concluida gera nova Matrícula em nova Turma.
Histórico sempre preservado. 1 Matrícula ativa por Programa. Toda ação administrativa é auditada.
