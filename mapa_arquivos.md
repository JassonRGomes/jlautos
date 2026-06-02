# Mapa de Arquivos - J&L Autos

Este mapa descreve os arquivos principais do sistema web (React + Node.js) hospedado no Hostinger, marcando as dependências rígidas ("linkados") e pastas que não podem ser renomeadas ou movidas sob risco de interrupção do funcionamento do site.

## Estrutura do Monorepo

```text
/
├── backend/                  <-- [NÃO MOVER] Servidor Express.js (Hospedagem Principal)
│   ├── public/               <-- [NÃO MOVER] Frontend exportado
│   │   ├── uploads/          <-- [NÃO MOVER] Armazenamento permanente de imagens dos carros
│   │   ├── index.html        <-- [LINKADO] Página inicial principal
│   │   ├── details.html      <-- [LINKADO] Página de detalhes dinâmicos (ID do carro)
│   │   ├── admin.html        <-- [LINKADO] Painel do Administrador
│   │   └── _next/            <-- [NÃO MOVER] Recursos JS/CSS essenciais do Next.js
│   ├── src/
│   │   ├── app.ts            <-- [LINKADO] Ponto de montagem das rotas. Serve a pasta public/
│   │   ├── routes/           <-- [LINKADO] Rotas da API (test-drives, settings, vehicles, etc)
│   │   ├── utils/pdf.ts      <-- Utilitário vital para exportação de PDFs do inventário
│   │   └── middlewares/      <-- Bloqueio e autenticação de usuários e administradores
│   ├── prisma/
│   │   └── schema.prisma     <-- [LINKADO] Estrutura do DB ORM (A tabela Offer foi removida daqui e do SQL)
│   ├── full_schema.sql       <-- Referência do DB com tabelas do MySQL originais
│   └── ecosystem.config.js   <-- [LINKADO] Script PM2 para religar servidor em caso de falha.
│
├── frontend/                 <-- Código fonte do painel de desenvolvimento
│   ├── src/app/
│   │   ├── page.tsx          <-- Landing page com o buscador avançado (marcas americanas integradas)
│   │   ├── vehicle/          <-- Renderizador de carro único (VehicleDetailsClient.tsx modificado)
│   │   └── ...               <-- Outras páginas do sistema
│   └── next.config.js        <-- [NÃO MOVER] Habilita `output: 'export'` para o React gerar arquivos estáticos
└── README.md                 <-- Guia de Instruções para updates SQL no painel MySQL do Hostinger.
```

## Elementos "Mãe" (Essenciais - NÃO ALTERAR NEM MOVER)
1. **`backend/public/uploads/`**
   - **Por que:** Contém as mídias em JPG/PNG dos carros importados pelo sistema. Apagar ou mover esta pasta fará com que as imagens do catálogo de luxo sumam.

2. **`backend/public/_next/`**
   - **Por que:** O Next.js agrupa toda a interatividade (React) dentro desse pacote minificado. Sem isso o sistema não funciona ou a navegação (botões, sliders) é quebrada.

3. **`backend/src/app.ts`**
   - **Por que:** Ele escuta as requisições na porta 5001/80 e determina se serve um dado da API, uma imagem ou a página HTML exportada pelo frontend. Mudar o caminho dos diretórios lidos por ele desconecta o frontend do backend.

4. **Variáveis de Ambiente (`.env`)**
   - Embora não mostradas explicitamente, o arquivo `.env` dentro de `/backend` conectando ao `DATABASE_URL` (Hostinger MySQL) deve permanecer inalterado na raiz do diretório `backend/`.
