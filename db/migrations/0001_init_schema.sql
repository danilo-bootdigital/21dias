-- ============================================================================
-- Código 21 — Migration 0001: schema inicial
-- Escopo (Bloco 3): extensões, enums, tabelas, índices e constraints.
-- NÃO inclui: RLS, views, functions/triggers (lógica), seed.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ===================== ENUMS =====================
create type turma_status       as enum ('agendada','contagem','ativa','encerrada','arquivada');
create type fase               as enum ('fundacao','tensao','dominio');
create type nivel              as enum ('recruta','sobrevivente','guerreiro','guerreiro_formado');
create type post_tipo          as enum ('texto','foto','video');
create type post_status        as enum ('publicado','oculto','removido');
create type entitlement_status as enum ('pendente','ativo','reembolsado','cancelado');
create type matricula_status   as enum ('ativa','concluida','cancelada');
create type evento_tipo        as enum ('palestra','mentoria');
create type app_role           as enum ('participante','moderador_turma','gestor','admin','suporte');
create type scope_type         as enum ('global','temporada','programa','turma');
create type raridade           as enum ('comum','rara','epica','lendaria');

-- ===================== CONFIG (sem hardcode) =====================
create table app_settings (
  id uuid primary key default gen_random_uuid(),
  scope_type scope_type not null default 'global',
  scope_id uuid,
  key text not null,
  value jsonb not null,
  descricao text,
  updated_at timestamptz not null default now(),
  unique (scope_type, scope_id, key)
);

-- ===================== ORGANIZAÇÕES (seam B2B — dormante) =====================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

-- ===================== IDENTIDADE =====================
-- users de domínio: o domínio NÃO referencia auth.users diretamente.
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  papel text not null default 'membro',
  unique (organization_id, user_id)
);

create table guerreiro_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  nome_guerreiro text not null,
  foto_url text,
  cidade text,
  bio text,
  melhor_temporada_id uuid,
  melhor_turma_id uuid,
  melhor_posicao int,
  maior_streak int not null default 0,
  created_at timestamptz not null default now()
);

-- ===================== ESTRUTURA DO PROGRAMA =====================
create table temporadas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano int not null,
  status text not null default 'ativa',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table programas (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references temporadas(id) on delete cascade,
  nome text not null,
  descricao text,
  duracao_dias int not null default 21 check (duracao_dias between 1 and 400),
  created_at timestamptz not null default now()
);

create table turmas (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references programas(id) on delete cascade,
  codigo text not null,
  status turma_status not null default 'agendada',
  timezone text not null default 'America/Sao_Paulo',
  starts_at timestamptz,
  ends_at timestamptz,
  tamanho_min int not null default 0,
  tamanho_max int,
  created_at timestamptz not null default now(),
  unique (programa_id, codigo)
);

create table protocolo_dias (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references programas(id) on delete cascade,
  numero int not null check (numero >= 1),
  fase fase not null,
  missao_titulo text not null,
  missao_descricao text,
  missao_pontos int not null default 40 check (missao_pontos between 30 and 60),
  unique (programa_id, numero)
);

create table habitos_definicao (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references programas(id) on delete cascade,
  nome text not null,
  descricao text,
  ordem int not null,
  pontos int not null default 10,
  unique (programa_id, ordem)
);

-- ===================== ACESSO & COMPROMISSO =====================
create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email text not null,
  turma_id uuid not null references turmas(id) on delete restrict,
  provider text not null,
  external_id text not null,
  valor_cents int,
  status entitlement_status not null default 'pendente',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id)   -- idempotência do webhook
);

create table matriculas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  turma_id uuid not null references turmas(id) on delete cascade,
  status matricula_status not null default 'ativa',
  contrato_assinado_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (user_id, turma_id)
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete cascade,
  versao_texto text not null,
  assinatura text not null,
  assinado_at timestamptz not null default now()
);

-- ===================== JORNADA & MÉTRICAS =====================
create table checkins (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete cascade,
  dia_numero int not null check (dia_numero >= 1),
  data date not null,
  missao_completa boolean not null default false,
  dia_perfeito boolean not null default false,
  check_in_publico boolean not null default false,
  pontos_dia int not null default 0,
  created_at timestamptz not null default now(),
  unique (matricula_id, dia_numero)   -- idempotência do check-in
);

create table checkin_habitos (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references checkins(id) on delete cascade,
  habito_id uuid not null references habitos_definicao(id) on delete restrict,
  cumprido boolean not null default false,
  unique (checkin_id, habito_id)
);

create table pontuacao_agregada (
  matricula_id uuid primary key references matriculas(id) on delete cascade,
  pontos_total int not null default 0,
  streak_atual int not null default 0,
  streak_recorde int not null default 0,
  dias_completos int not null default 0,
  dias_perfeitos int not null default 0,
  indice_disciplina numeric(5,2) not null default 0,   -- corrente
  disciplina_final numeric(5,2),                        -- congelado no encerramento
  nivel_atual nivel not null default 'recruta',         -- monotônico (lógica vem depois)
  atualizado_at timestamptz not null default now()
);

-- ===================== SOCIAL =====================
create table posts (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references matriculas(id) on delete cascade,
  turma_id uuid not null references turmas(id) on delete cascade,
  tipo post_tipo not null,
  conteudo text,
  media_url text,
  status post_status not null default 'publicado',
  created_at timestamptz not null default now()
);

create table curtidas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  matricula_id uuid not null references matriculas(id) on delete cascade,
  unique (post_id, matricula_id)
);

create table comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  matricula_id uuid not null references matriculas(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

-- ===================== CONQUISTAS & LEGADO =====================
create table conquistas_definicao (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  descricao text,
  raridade raridade not null default 'comum'
);

create table conquistas_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  conquista_id uuid not null references conquistas_definicao(id) on delete cascade,
  matricula_id uuid references matriculas(id) on delete set null,
  temporada_id uuid references temporadas(id) on delete set null,
  conquistada_at timestamptz not null default now(),
  unique (user_id, conquista_id, matricula_id)
);

create table certificados (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null unique references matriculas(id) on delete cascade,
  nivel_final nivel not null,
  disciplina_final numeric(5,2) not null,
  emitido_at timestamptz not null default now(),
  url text
);

create table hall_entries (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references turmas(id) on delete cascade,
  matricula_id uuid not null references matriculas(id) on delete cascade,
  posicao int,
  nivel_final nivel,
  disciplina_final numeric(5,2),
  created_at timestamptz not null default now(),
  unique (turma_id, matricula_id)
);

-- ===================== BORDAS =====================
create table eventos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references turmas(id) on delete cascade,
  programa_id uuid references programas(id) on delete cascade,
  tipo evento_tipo not null,
  titulo text not null,
  descricao text,
  datetime timestamptz not null,
  link_externo text
);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipo text not null,
  payload jsonb,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===================== RBAC & AUDITORIA =====================
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role app_role not null,
  scope_type scope_type not null default 'global',
  scope_id uuid,
  unique (user_id, role, scope_type, scope_id)
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  acao text not null,
  alvo text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ===================== ÍNDICES =====================
create index idx_org_members_user      on organization_members(user_id);
create index idx_programas_temporada    on programas(temporada_id);
create index idx_turmas_programa         on turmas(programa_id);
create index idx_turmas_status           on turmas(status);
create index idx_protocolo_programa      on protocolo_dias(programa_id);
create index idx_habitos_programa        on habitos_definicao(programa_id);
create index idx_entitlements_email      on entitlements(email);
create index idx_entitlements_turma      on entitlements(turma_id);
create index idx_entitlements_user       on entitlements(user_id);
create index idx_matriculas_user         on matriculas(user_id);
create index idx_matriculas_turma        on matriculas(turma_id);
create index idx_contratos_matricula     on contratos(matricula_id);
create index idx_checkin_habitos_checkin on checkin_habitos(checkin_id);
create index idx_checkin_habitos_habito  on checkin_habitos(habito_id);
create index idx_pontuacao_pontos        on pontuacao_agregada(pontos_total desc);
create index idx_pontuacao_streak        on pontuacao_agregada(streak_atual desc);
create index idx_posts_turma_created     on posts(turma_id, created_at desc);
create index idx_posts_matricula         on posts(matricula_id);
create index idx_curtidas_post           on curtidas(post_id);
create index idx_comentarios_post        on comentarios(post_id);
create index idx_conquistas_user         on conquistas_usuario(user_id);
create index idx_hall_turma              on hall_entries(turma_id);
create index idx_eventos_turma           on eventos(turma_id);
create index idx_eventos_programa        on eventos(programa_id);
create index idx_notificacoes_user       on notificacoes(user_id, lida);
create index idx_user_roles_user         on user_roles(user_id);
create index idx_user_roles_scope        on user_roles(scope_type, scope_id);

-- ===================== RLS — deny-all (proteção inicial) =====================
-- Habilita RLS em TODAS as tabelas. Sem nenhuma policy, isso bloqueia qualquer
-- acesso via anon/authenticated (PostgREST) — apenas a service role ignora a RLS.
-- As POLICIES entram no Bloco 4; aqui só fechamos a porta como default seguro.
alter table app_settings          enable row level security;
alter table organizations         enable row level security;
alter table users                 enable row level security;
alter table organization_members  enable row level security;
alter table guerreiro_profiles    enable row level security;
alter table temporadas            enable row level security;
alter table programas             enable row level security;
alter table turmas                enable row level security;
alter table protocolo_dias        enable row level security;
alter table habitos_definicao     enable row level security;
alter table entitlements          enable row level security;
alter table matriculas            enable row level security;
alter table contratos             enable row level security;
alter table checkins              enable row level security;
alter table checkin_habitos       enable row level security;
alter table pontuacao_agregada    enable row level security;
alter table posts                 enable row level security;
alter table curtidas              enable row level security;
alter table comentarios           enable row level security;
alter table conquistas_definicao  enable row level security;
alter table conquistas_usuario    enable row level security;
alter table certificados          enable row level security;
alter table hall_entries          enable row level security;
alter table eventos               enable row level security;
alter table notificacoes          enable row level security;
alter table user_roles            enable row level security;
alter table audit_log             enable row level security;
