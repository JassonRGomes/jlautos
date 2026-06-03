#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# J&L AUTOS — Atalho para acessar o MySQL (Hostinger)
# ─────────────────────────────────────────────────────────────────
# Uso: ./mysql.sh          → abre o console interativo
#      ./mysql.sh "SELECT * FROM User LIMIT 5;"  → executa query direta

DB_USER="u373012508_jlautos"
DB_PASS="J210870c"
DB_NAME="u373012508_JLautos"
DB_HOST="127.0.0.1"
DB_PORT="3306"

if [ -n "$1" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "$1"
else
  echo "🔌 Conectando ao MySQL → $DB_NAME@$DB_HOST..."
  mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME"
fi
