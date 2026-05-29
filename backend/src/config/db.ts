import { PrismaClient } from '@prisma/client';

// Strip surrounding quotes that some environments (e.g. Hostinger hPanel) include
// when reading .env values, which causes Prisma to reject the URL.
const rawDbUrl = process.env.DATABASE_URL || '';
const databaseUrl = rawDbUrl.replace(/^["']|["']$/g, '');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
