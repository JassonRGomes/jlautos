import { PrismaClient } from '@prisma/client';

let dbUrl = process.env.DATABASE_URL || '';

// Auto-fix URL encoding for passwords with special characters like '&'
const regex = /:\/\/(.*?):(.*?)@/;
const match = dbUrl.match(regex);
if (match && match[2].includes('&')) {
  dbUrl = dbUrl.replace(`:${match[2]}@`, `:${match[2].replace(/&/g, '%26')}@`);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

export default prisma;
