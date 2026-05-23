// Hostinger Node.js Entry Point Proxy
// This file routes the execution to the compiled backend directory.
const path = require('path');
const fs = require('fs');

console.log("Iniciando rotinas de deploy automático...");
try {
  const envPath = path.join(__dirname, 'backend', '.env');
  
  // Carrega as variáveis de ambiente explicitamente do backend
  const dotenvPath = path.join(__dirname, 'backend', 'node_modules', 'dotenv');
  if (fs.existsSync(dotenvPath)) {
    require(dotenvPath).config({ path: envPath });
  }

  console.log("Servidor iniciado. Banco será sincronizado no primeiro acesso via API (app.ts).");
} catch (error) {
  console.error("ERRO CRÍTICO no carregamento de ambiente:", error.message);
}

// Inicia o app compilado
require('./backend/dist/app.js');
