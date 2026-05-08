# Nova Era Lanchonete — Sistema Administrativo

## Visão Geral

Sistema administrativo profissional para lanchonete/restaurante. Fullstack com autenticação JWT, banco de dados PostgreSQL, painel administrativo com controle de pedidos, produtos, promoções e usuários.

## Arquitetura

### Frontend — `artifacts/nova-era-admin`
- React + Vite + TypeScript
- TailwindCSS v4 — tema escuro preto + azul royal
- Wouter (roteamento)
- TanStack Query (estado assíncrono)
- Framer Motion (animações)
- Recharts (gráficos)
- Radix UI / shadcn componentes

### Backend — `artifacts/api-server`
- Node.js + Express.js v5 + TypeScript
- Autenticação JWT (access token 15min + refresh token 7 dias)
- Rate limiting, brute force protection, audit log
- Build via esbuild, ESM output

### Banco de Dados — `lib/db`
- Drizzle ORM + PostgreSQL
- Schema: users, categories, products, orders, order_items, promotions, refresh_tokens, audit_logs, login_attempts

### Bibliotecas compartilhadas
- `lib/api-zod` — schemas Zod para validação das rotas
- `lib/api-client-react` — hooks React Query gerados do OpenAPI spec
- `lib/api-spec` — OpenAPI YAML spec

## Papéis de Usuário

| Papel | Acesso |
|-------|--------|
| `employee` (Funcionário) | Visualiza e atualiza pedidos, vê produtos/categorias |
| `manager` (Gerente) | Tudo do funcionário + gerencia produtos, categorias e promoções |
| `admin` (Administrador) | Acesso total, incluindo gerenciamento de usuários |

## Configuração de Ambiente

Variáveis necessárias (já configuradas como secrets):
- `DATABASE_URL` — URL de conexão PostgreSQL
- `SESSION_SECRET` — Segredo para assinar JWT
- `PORT` — Porta do servidor (gerenciado automaticamente pela Replit/Railway)

## Comandos Úteis

```bash
# Aplicar schema no banco
pnpm --filter @workspace/db run push

# Seed inicial (admin, gerente, funcionário + categorias)
pnpm --filter @workspace/scripts run seed

# Typecheck completo
pnpm run typecheck

# Build de produção
pnpm run build
```

## Deploy — Railway

O projeto está configurado para deploy no Railway via `railway.json`. Para deploy:

1. Conectar repositório ao Railway
2. Configurar variáveis de ambiente: `DATABASE_URL`, `SESSION_SECRET`, `PORT`
3. O Railway usa Nixpacks para build automaticamente
4. Para o backend: `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start`
5. Para o frontend: build estático via `pnpm --filter @workspace/nova-era-admin run build`

## User Preferences

- Idioma: Português (Brasil)
- Design: Tema escuro, preto + azul royal
- Código em TypeScript profissional e escalável
- Arquitetura modular — não simplificar
- Compatibilidade mobile obrigatória
