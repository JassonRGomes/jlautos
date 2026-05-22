// Hostinger Node.js Entry Point Proxy
// This file routes the execution to the compiled backend directory.
const { execSync } = require('child_process');

console.log("Starting deployment tasks...");
try {
  // Sincroniza o banco de dados automaticamente
  console.log("Gerando o cliente Prisma e aplicando schema no banco de dados...");
  execSync('cd backend && npx prisma generate && npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log("Banco de dados sincronizado com sucesso.");
} catch (error) {
  console.error("Falha ao sincronizar banco de dados:", error);
}

// Inicia o app compilado
require('./backend/dist/app.js');
