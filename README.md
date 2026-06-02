# J&L Autos - Atualização do Sistema

Este repositório contém a versão mais recente do sistema J&L Autos, com a funcionalidade "Make an Offer" permanentemente removida, e várias melhorias como a inclusão completa da lista de marcas de veículos vendidas nos EUA, bem como a correção das impressões em PDF do Admin.

## Instruções para o Servidor (Hostinger)

### 1. Atualização do Banco de Dados (MySQL)
Como você precisa remover completamente a estrutura de ofertas, você deverá acessar o banco de dados de produção (via phpMyAdmin no painel da Hostinger, ou terminal SSH) e rodar as seguintes _queries_ para excluir a tabela antiga:

```sql
-- Primeiro, desabilitar as chaves estrangeiras temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Excluir a tabela Offer
DROP TABLE IF EXISTS `Offer`;

-- Reativar as chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;
```

> [!NOTE]
> Essa query apagará a funcionalidade anterior permanentemente. As chaves estrangeiras que apontavam para `User` e `Vehicle` na tabela `Offer` também serão destruídas.

### 2. Reinicialização Automática com PM2
Para garantir que o backend node.js inicie automaticamente (caso o servidor da Hostinger reinicie) ou se o app fechar ("crash"), incluí um arquivo `ecosystem.config.js`.

Para iniciar e salvar no PM2 (rodar via SSH na pasta `/backend`):
```bash
# Caso o pm2 não esteja instalado no servidor globalmente:
npm install -g pm2

# Iniciar o backend via PM2 (na pasta /backend)
pm2 start ecosystem.config.js

# Salvar a lista para inicialização automática no boot do VPS
pm2 save
pm2 startup
```

### 3. Deploy dos Arquivos Estáticos (Website)
A interface foi reconstruída utilizando `Next.js Static Export`. Não é necessário rodar o frontend com `npm start`. Todos os arquivos já estão na pasta `/backend/public`.

O backend do Node.js já está configurado para servir todo esse HTML e JS. Portanto, ao rodar a API (porta 5001/etc), o site principal já vai abrir automaticamente, com a versão nova!

## Suporte a Geração de PDF
A correção do PDF envolvia a ausência dos cabeçalhos corretos (`Content-Type: application/pdf`). Ao baixar agora via o Dashboard de Admin, o navegador irá tratar e abrir o PDF nativamente sem arquivos corrompidos.
