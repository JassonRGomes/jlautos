"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Strip surrounding quotes that some environments (e.g. Hostinger hPanel) include
// when reading .env values, which causes Prisma to reject the URL.
const rawDbUrl = process.env.DATABASE_URL || '';
const databaseUrl = rawDbUrl.replace(/^["']|["']$/g, '');
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
exports.default = prisma;
//# sourceMappingURL=db.js.map