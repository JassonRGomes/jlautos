"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
// Strip surrounding quotes that some environments (e.g. Hostinger hPanel) include
// when reading .env values, which causes Prisma to reject the URL.
const rawDbUrl = process.env.DATABASE_URL || '';
let databaseUrl = rawDbUrl.replace(/^["']|["']$/g, '');
// Fallback to hardcoded URL if env var is missing or invalid
if (!databaseUrl || !databaseUrl.startsWith('mysql://')) {
    console.warn('[DB] DATABASE_URL not found in env, using hardcoded fallback.');
    databaseUrl = 'mysql://u373012508_jlautos:J210870c@127.0.0.1:3306/u373012508_JLautos';
}
// Removed localhost -> 127.0.0.1 replacement for Hostinger compatibility
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