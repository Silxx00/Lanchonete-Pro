#!/bin/sh
set -e

echo "==> Aplicando schema no banco de dados..."
pnpm --filter @workspace/db run push-force

echo "==> Criando usuarios iniciais (se nao existirem)..."
pnpm --filter @workspace/scripts run seed

echo "==> Iniciando servidor..."
exec node --enable-source-maps artifacts/api-server/dist/index.js
