import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Strip surrounding quotes that some environments (e.g. Hostinger hPanel) include
// when reading .env values, which causes Prisma to reject the URL.
const rawDbUrl = process.env.DATABASE_URL || '';
let databaseUrl = rawDbUrl.replace(/^["']|["']$/g, '');

// Fallback to hardcoded URL if env var is missing or invalid
if (!databaseUrl || !databaseUrl.startsWith('mysql://')) {
  console.warn('[DB] DATABASE_URL not found in env, using hardcoded fallback.');
  databaseUrl = 'mysql://u373012508_jlautos:J210870c@127.0.0.1:3306/u373012508_JLautos';
}

// Force localhost -> 127.0.0.1 to ensure TCP (not Unix socket) connection
databaseUrl = databaseUrl.replace('@localhost:', '@127.0.0.1:');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

