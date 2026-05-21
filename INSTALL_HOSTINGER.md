# 🚀 Guia de Implantação no Servidor Hostinger — J&L Autos

Este guia detalha o processo completo para instalar e configurar o sistema **J&L Autos** na Hostinger (VPS ou Hospedagem Compartilhada com suporte a Node.js).

O sistema é composto por dois módulos que precisam rodar simultaneamente:
- **Backend** — API REST em Node.js/Express com Prisma ORM (Porta `5001`)
- **Frontend** — Interface Next.js 16 App Router (Porta `3000`)

---

## 📋 1. Pré-Requisitos no hPanel

Antes de começar, verifique no seu painel Hostinger:

- ✅ Plano com suporte a **Node.js v20+**
- ✅ Acesso **SSH** habilitado
- ✅ Banco de dados **MySQL** criado no hPanel > Bancos de Dados

---

## 🗄️ 2. Criação do Banco de Dados MySQL

1. Acesse **hPanel → Bancos de Dados → MySQL Databases**
2. Crie um novo banco de dados e anote:

| Campo | Exemplo |
|---|---|
| Host | `localhost` ou `127.0.0.1` |
| Porta | `3306` |
| Nome do Banco | `u123456789_jlautos` |
| Usuário | `u123456789_admin` |
| Senha | `SuaSenhaForte2026!` |

---

## 📁 3. Upload do Projeto via Git

Conecte-se ao servidor via SSH e clone o repositório:

```bash
# Conectar via SSH
ssh u123456789@seudominio.com.br

# Ir para a pasta de hospedagem
cd public_html

# Clonar o repositório
git clone https://github.com/JassonRGomes/jlautos.git .
```

---

## ⚙️ 4. Configuração do Backend (API)

### 4.1 — Criar o arquivo `.env` do Backend

O arquivo `.env` **não está no repositório por segurança**. Use o template disponível:

```bash
cd backend

# Copiar o template
cp .env.example .env

# Editar com suas credenciais reais
nano .env
```

**Preencha os campos essenciais:**
```env
PORT=5001
NODE_ENV="production"

# ⚠️ SUBSTITUA com suas credenciais MySQL do hPanel
DATABASE_URL="mysql://u123456789_admin:SuaSenhaForte2026!@localhost:3306/u123456789_jlautos"

# Gere uma string aleatória longa e segura
JWT_SECRET="cole_aqui_uma_chave_secreta_muito_longa_e_aleatoria"

# URL do seu domínio principal
FRONTEND_URL="https://seudominio.com.br"
```

Salve e feche: `Ctrl+X → Y → Enter`

### 4.2 — Instalar dependências e sincronizar o banco

```bash
# Instalar pacotes Node.js
npm install

# Gerar o cliente Prisma (necessário após qualquer alteração no schema)
npx prisma generate

# Criar todas as tabelas no banco de dados MySQL
npx prisma db push
```

> ✅ Após `db push`, você verá as tabelas criadas no seu banco MySQL.

### 4.3 — Compilar e iniciar o Backend

```bash
# Compilar o TypeScript para JavaScript
npm run build

# Iniciar com PM2 (gerenciador de processos — mantém o servidor ativo 24/7)
npm install -g pm2
pm2 start dist/app.js --name "jl-backend"
pm2 startup
pm2 save
```

---

## 🖥️ 5. Configuração do Frontend (Next.js)

### 5.1 — Criar o arquivo `.env.local` do Frontend

```bash
cd ../frontend

# Copiar o template
cp .env.example .env.local

# Editar com a URL da sua API
nano .env.local
```

**Preencha:**
```env
# URL pública da sua API (subdomínio ou porta direta)
NEXT_PUBLIC_BACKEND_URL="https://api.seudominio.com.br"
```

### 5.2 — Instalar e gerar a build de produção

```bash
npm install
npm run build
```

### 5.3 — Iniciar o Frontend

```bash
pm2 start npm --name "jl-frontend" -- run start
pm2 save
```

---

## 🌐 6. Configuração de Domínio e Proxy Reverso

No hPanel, configure os domínios para apontar para os processos Node.js:

| Domínio | Processo | Porta |
|---|---|---|
| `seudominio.com.br` | Frontend (Next.js) | `3000` |
| `api.seudominio.com.br` | Backend (Express) | `5001` |

### Proxy via `.htaccess` (se necessário):
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```
*(No subdomínio da API, troque `3000` por `5001`)*

---

## 🔍 7. Verificação Final

Após tudo configurado, acesse:

- `https://seudominio.com.br` → Loja e Showroom ✅
- `https://api.seudominio.com.br/health` → Deve retornar `{"status":"OK","database":"Connected"}` ✅

### Credenciais de Acesso Padrão:

| Perfil | Email | Senha |
|---|---|---|
| 🛡️ Administrador | `admin@jlautos.com` | `admin` |
| 🌟 Cliente VIP | `vip.buyer@gmail.com` | `CustomerPass2026!` |

---

## 📞 Suporte

Dúvidas sobre configuração de banco de dados MySQL na Hostinger:
[Documentação Oficial Hostinger](https://support.hostinger.com/en/articles/1583558-how-to-create-and-manage-mysql-databases)

---

*Engineered with excellence. J&L Autos 2026.*
