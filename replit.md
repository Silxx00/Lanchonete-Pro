# Nova Era Lanchonete — Admin Panel

Sistema administrativo completo para a lanchonete Nova Era. Painel escuro, premium e responsivo para gerenciamento do negócio.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/nova-era-admin run dev` — run the admin frontend (port 23334, served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Shadcn UI, Framer Motion, Recharts, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/db/src/schema/` — Drizzle DB schemas (users, categories, products, orders, promotions)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/nova-era-admin/src/pages/` — Admin frontend pages
- `artifacts/nova-era-admin/src/components/layout/` — Sidebar, TopBar, AppLayout
- `lib/api-client-react/src/generated/` — Generated React Query hooks

## Architecture decisions

- JWT tokens: access (15min) + refresh (7d), stored in memory Map — replace with Redis for production
- Passwords hashed with bcrypt (12 rounds)
- Custom fetch interceptor in `lib/api-client-react/src/custom-fetch.ts` injects Bearer token from localStorage
- `formatCurrency` in `src/lib/utils.ts` uses `Intl.NumberFormat` with pt-BR locale for R$ formatting
- The `lib/api-zod/src/index.ts` barrel is rewritten by the codegen script to prevent duplicate export conflicts with orval's generated types

## Product

- Login screen with brand identity and JWT auth
- Dashboard with live stats, sales chart (7-day), top products, recent orders
- Products CRUD with category filtering and search
- Categories CRUD
- Orders management with status tracking (pending → accepted → preparing → ready → delivered / cancelled)
- Promotions & coupons system (percentage and fixed discounts)
- User management (admin, manager, employee roles)

## User preferences

- Language: Portuguese (pt-BR) in UI labels and toast messages
- Currency: R$ (Brazilian Real) with pt-BR formatting
- Design: dark, premium — Black + Royal Blue palette (primary: hsl(221 83% 53%), bg: hsl(222 35% 4%), sidebar: hsl(222 40% 3%))
- NO yellow, orange, or red in UI (red only for destructive/error actions)

## Gotchas

- After changing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` — the script also rewrites the api-zod barrel to prevent TS2308 duplicate export errors
- Do NOT add `export * from "./generated/types"` back to `lib/api-zod/src/index.ts` — the codegen script overwrites it intentionally
- `pnpm --filter @workspace/db run push-force` if push fails with column conflicts

## Default credentials (development seed data)

- Admin: `admin@novaera.com` / `admin123`
- Gerente: `gerente@admin.com` / `Gerente123`
- Funcionário: `funcionario@admin.com` / `Funcionario123`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
