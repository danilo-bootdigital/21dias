# Código 21

Plataforma de transformação comportamental — jornada de disciplina de 21 dias.

> **Status:** Sprint 0 · Bloco 1 (Bootstrap & tooling). Apenas o esqueleto do projeto.
> Schema, Supabase, auth e regras de negócio entram nos blocos seguintes.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** (tokens dark + dourado da marca)
- **ESLint** + **Prettier**
- Supabase (Postgres/Auth/Storage) — _a configurar no Bloco 2_

## Rodar localmente

```bash
npm install          # instala as dependências
cp .env.example .env.local   # variáveis (valores entram nos próximos blocos)
npm run dev          # http://localhost:3000
```

Outros comandos:

```bash
npm run build        # build de produção
npm run lint         # ESLint
npm run format       # Prettier (write)
```

## Estrutura

```
app/            rotas (App Router) — (auth) (app) (admin) api/
components/     UI (design system dark+dourado)
lib/            domínio (regras puras) + supabase/auth/rankings/notifications
db/             schema, policies, views, functions, seed, migrations
types/          tipos TS
tests/          testes
```

A especificação completa do produto e da arquitetura está no documento mestre do plano.
