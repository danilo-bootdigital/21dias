-- ============================================================================
-- Código 21 — Mini-seed (Bloco 6). Idempotente, IDs fixos, compatível com o
-- seed completo do Bloco 7 (mesmos IDs; só estende). Não cria entitlements.
-- ============================================================================

insert into temporadas (id, nome, ano, status, is_publicado)
values ('00000000-0000-0000-0000-0000000000a1','Temporada 2026',2026,'ativa',true)
on conflict (id) do nothing;

insert into programas (id, temporada_id, nome, descricao, duracao_dias, is_publicado)
values ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a1',
        'Código 21','Jornada de 21 dias de disciplina.',21,true)
on conflict (id) do nothing;

insert into turmas (id, programa_id, codigo, status, timezone)
values ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a2',
        '001','agendada','America/Sao_Paulo')
on conflict (programa_id, codigo) do nothing;

insert into protocolo_dias (programa_id, numero, fase, missao_titulo, missao_pontos)
select '00000000-0000-0000-0000-0000000000a2', n,
       (case when n<=7 then 'fundacao' when n<=14 then 'tensao' else 'dominio' end)::fase,
       'Missão do dia '||n, 40
from generate_series(1,21) as n
on conflict (programa_id, numero) do nothing;

insert into habitos_definicao (programa_id, nome, ordem, pontos)
select '00000000-0000-0000-0000-0000000000a2', h.nome, h.ord, 10
from (values
  ('Acordar antes das 7h',1),('Treino 40 min',2),('Oração ou meditação',3),
  ('Estudo',4),('Água',5),('Alimentação limpa',6),('Movimento extra',7),
  ('Dormir no horário',8),('Zero procrastinação',9),('Check-in público',10)
) as h(nome,ord)
on conflict (programa_id, ordem) do nothing;
