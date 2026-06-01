#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# J&L AUTOS — Atalho para acessar o MySQL (Hostinger)
# ─────────────────────────────────────────────────────────────────
# Uso: ./mysql.sh          → abre o console interativo
#      ./mysql.sh "SELECT * FROM User LIMIT 5;"  → executa query direta

DB_USER="db_user"
DB_PASS="db_pass"
DB_NAME="db_name"
DB_HOST="db_host"
DB_PORT="3306"

if [ -n "$1" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "$1"
else
  echo "🔌 Conectando ao MySQL → $DB_NAME@$DB_HOST..."
  mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME"
fi
