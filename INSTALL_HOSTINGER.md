# 🚀 Guia de Implantação no Servidor Hostinger

Este guia detalha o processo passo-a-passo para instalar e configurar o sistema **J&L Autos** em um servidor Hostinger (seja VPS ou Hospedagem Compartilhada com suporte a Node.js).

O sistema possui duas partes (Frontend Next.js e Backend Express/Prisma), que precisarão rodar simultaneamente.

---

## 📋 1. Pré-requisitos
No seu painel Hostinger (hPanel):
- Certifique-se de que o plano possui suporte a **Node.js** (recomenda-se Node v20+).
- Acesso via **SSH** habilitado (para rodar os comandos no terminal).
- Um banco de dados **MySQL** ou **PostgreSQL** criado.

---

## 🗄️ 2. Configuração do Banco de Dados
1. Acesse o hPanel -> **Bancos de Dados MySQL**.
2. Crie um novo banco de dados.
3. Anote as seguintes informações:
   - **Nome do Banco de Dados**
   - **Usuário do Banco**
   - **Senha**
   - **Host** (geralmente `localhost` ou `127.0.0.1`)

---

## ⚙️ 3. Deploy do Backend (API)

1. Faça o upload dos arquivos do projeto via Gerenciador de Arquivos ou conecte via SSH e faça o clone (`git clone`).
2. Acesse a pasta do backend via SSH:
   ```bash
   cd "J L AUTOS/backend"
   ```
3. Crie o arquivo `.env` baseado nas suas credenciais do banco:
   ```env
   PORT=5001
   DATABASE_URL="mysql://SEU_USUARIO:SUA_SENHA@localhost:3306/NOME_DO_BANCO"
   JWT_SECRET="jl_autos_premium_luxury_secret_key_2026"
   NODE_ENV="production"
   FRONTEND_URL="https://seudominio.com.br"
   ```
   *(Nota: Se preferir PostgreSQL, altere o provedor no `schema.prisma` e a URL de conexão correspondente).*

4. Instale as dependências e gere o cliente do banco de dados:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```

5. Compile o projeto:
   ```bash
   npm run build
   ```

6. Inicie a aplicação:
   - Se for VPS, recomenda-se usar o PM2:
     ```bash
     npm install -g pm2
     pm2 start dist/app.js --name "jl-backend"
     pm2 save
     ```
   - Se for Hospedagem Compartilhada (Node.js App), aponte o arquivo de inicialização para `server.js` na raiz do projeto, ou para `backend/dist/app.js`.

---

## 🖥️ 4. Deploy do Frontend (Next.js)

1. Acesse a pasta do frontend via SSH:
   ```bash
   cd "../frontend"
   ```
2. Crie o arquivo `.env` para produção:
   ```env
   NEXT_PUBLIC_BACKEND_URL="https://api.seudominio.com.br"
   ```
3. Instale as dependências e gere a build estática/otimizada do Next.js:
   ```bash
   npm install
   npm run build
   ```
4. Inicie o Frontend:
   - Via PM2:
     ```bash
     pm2 start npm --name "jl-frontend" -- run start
     pm2 save
     ```
   - Via App Node.js da Hostinger, aponte o comando de inicialização para iniciar o Next.js.

---

## 🌐 5. Configuração de Domínio e Rotas (Apache/Nginx/Proxy)

Na Hostinger, você deve garantir que o tráfego da porta 80/443 (HTTP/HTTPS) seja redirecionado para as portas das suas aplicações Node.js internas.

- **Domínio Principal (`seudominio.com.br`)**: Deve apontar para a porta do Frontend (Padrão: `3000`).
- **Subdomínio da API (`api.seudominio.com.br`)**: Deve apontar para a porta do Backend (Padrão: `5001`).

Caso a hospedagem seja via cPanel/hPanel com `.htaccess`, você pode configurar um *Reverse Proxy* no `.htaccess`:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

*(Faça o mesmo no subdomínio da API, apontando para a porta `5001`)*.

---

## 🎉 Conclusão
Após configurar as portas e variáveis de ambiente, acesse seu domínio principal. O sistema J&L Autos estará ativo, com os catálogos disponíveis e o painel administrativo protegido e pronto para uso.
