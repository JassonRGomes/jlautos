#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# J&L AUTOS — Script de Setup no Hostinger
# Execute este script via SSH no servidor Hostinger
# ─────────────────────────────────────────────────────────────────

set -e  # Para em caso de erro

echo "════════════════════════════════════════════════"
echo "   J&L AUTOS — Setup do Backend (Hostinger)"
echo "════════════════════════════════════════════════"
echo ""

# Vai para o diretório do backend
cd "$(dirname "$0")/../backend"

echo "[1/4] Instalando dependências npm..."
npm install --production=false

echo ""
echo "[2/4] Gerando Prisma Client..."
npx prisma generate

echo ""
echo "[3/4] Sincronizando schema com banco de dados MySQL..."
npx prisma db push

echo ""
echo "[4/4] Criando usuário admin no banco de dados..."
npx ts-node src/prisma/seed.ts

echo ""
echo "════════════════════════════════════════════════"
echo "✅ Setup concluído com sucesso!"
echo ""
echo "   Acesso ao sistema:"
echo "   Email: admin@jlautos.com"
echo "   Senha: admin"
echo ""
echo "   Para iniciar o servidor:"
echo "   npm run build && pm2 start ecosystem.config.js --env production"
echo "════════════════════════════════════════════════"
