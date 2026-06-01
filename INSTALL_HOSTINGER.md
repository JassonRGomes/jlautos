# 🚀 Instalação no Hostinger — J&L Autos

## Credenciais do Banco de Dados

| Campo         | Valor                                       |
|---------------|---------------------------------------------|
| Banco         | `db_name`                        |
| Usuário MySQL | `db_user`                        |
| Senha         | `db_pass`                                  |
| Host          | `host_name`  |
| Porta         | `33XX`                                      |

---

## Acesso ao Sistema (após setup)

| Campo | Valor              |
|-------|--------------------|
| Email | `user` |
| Senha | `pass`            |

---

## Passo a Passo via SSH no Hostinger

### 1. Conectar via SSH
No hPanel → SSH Access, obtenha as credenciais e conecte:
```bash
ssh u373012508@lightcyan-shark-136321.hostingersite.com -p 65002
```

### 2. Fazer upload do projeto
No hPanel, use o **File Manager** ou **FTP** para enviar a pasta `backend/` para o servidor (ex: `~/domains/lightcyan-shark-136321.hostingersite.com/public_html/backend/`).

### 3. Executar o setup automático via SSH
```bash
cd ~/domains/lightcyan-shark-136321.hostingersite.com/public_html
bash scripts/setup-hostinger.sh
```

**Ou de forma simplificada a partir da raiz do projeto:**

```bash
# Na raiz do projeto, execute o comando de instalação (isso instalará as dependências do backend e gerará o Prisma Client automaticamente)
npm install

# Em seguida, configure as tabelas e o usuário administrador no banco:
cd backend
npx prisma db push
npx ts-node src/prisma/seed.ts
```

### 4. Build e iniciar com PM2
```bash
# Build TypeScript
npm run build

# Iniciar com PM2 em modo produção
pm2 start ecosystem.config.js --env production

# Salvar configuração PM2 (para reiniciar automaticamente)
pm2 save
pm2 startup
```

### 5. Verificar que está funcionando
```bash
# Verificar status do PM2
pm2 status

# Ver logs em tempo real
pm2 logs jlautos-erp-backend

# Testar endpoint de saúde
curl http://localhost:5001/health
```

Resposta esperada:
```json
{"status":"OK","database":"Connected"}
```

---

## Estrutura do Banco de Dados

O Prisma vai criar automaticamente as seguintes tabelas no banco `u373012508_JLautos`:

- `User` — Usuários do sistema (admin, vendedores)
- `Session` — Sessões JWT
- `Vehicle` — Veículos no estoque
- `Customer` — Clientes
- `Sale` / `SaleItem` — Vendas
- `Booking` — Agendamentos
- `TestDrive` — Test drives
- `Dealership` — Concessionárias
- `AvailabilitySlot` — Horários disponíveis
- `Product` / `Category` / `Supplier` — Peças e estoque
- `FinancialTransaction` — Transações financeiras
- `ActivityLog` — Log de atividades
- `Favorite` / `SavedSearch` — Funcionalidades do usuário

---

## Solução de Problemas

### Erro: "Can't reach database server"
> Isso é normal ao testar localmente. O MySQL do Hostinger só aceita conexões de dentro do servidor. Execute os comandos via SSH.

### Erro: "Table already exists"
```bash
# Resetar e recriar o banco
npx prisma db push --force-reset
npx ts-node src/prisma/seed.ts
```

### Recriar apenas o usuário admin
```bash
cd backend
npx ts-node src/prisma/seed.ts
```

---

## Variáveis de Ambiente Importantes (`backend/.env`)

```env
DATABASE_URL="mysql://db_userc@host_name:3306/db_name"
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://site_name
JWT_SECRET=jesus_is_love
```
