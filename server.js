// Hostinger Node.js Entry Point Proxy
// This file routes the execution to the compiled backend directory.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log("Iniciando rotinas de deploy automático...");
try {
  const nodePath = process.execPath;
  const prismaPath = path.join(__dirname, 'backend', 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = path.join(__dirname, 'backend', 'prisma', 'schema.prisma');
  const envPath = path.join(__dirname, 'backend', '.env');
  
  // Carrega as variáveis de ambiente explicitamente do backend
  const dotenvPath = path.join(__dirname, 'backend', 'node_modules', 'dotenv');
  if (fs.existsSync(dotenvPath)) {
    require(dotenvPath).config({ path: envPath });
  }

  console.log("Gerando o cliente Prisma e aplicando schema no banco de dados...");
  
  if (fs.existsSync(prismaPath)) {
    // Executa o Prisma diretamente via Node, evitando problemas com npx e PATH na Hostinger
    execSync(`"${nodePath}" "${prismaPath}" generate --schema="${schemaPath}"`, { stdio: 'inherit', env: process.env });
    execSync(`"${nodePath}" "${prismaPath}" db push --schema="${schemaPath}" --accept-data-loss`, { stdio: 'inherit', env: process.env });
    console.log("Banco de dados sincronizado e tabelas criadas com sucesso!");
  } else {
    console.error(`AVISO: Prisma não encontrado em ${prismaPath}. O comando npm install foi executado?`);
  }
} catch (error) {
  console.error("ERRO CRÍTICO ao sincronizar banco de dados:", error.message);
  if (error.stdout) console.error("STDOUT:", error.stdout.toString());
  if (error.stderr) console.error("STDERR:", error.stderr.toString());
}

// Inicia o app compilado
require('./backend/dist/app.js');
