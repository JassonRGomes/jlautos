const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = process.env.DATABASE_URL.replace('localhost', '127.0.0.1');
const prisma = new PrismaClient();
async function run() {
  try {
    const res = await prisma.dealership.findFirst();
    console.log("Connected! Dealership:", res);
  } catch (e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
