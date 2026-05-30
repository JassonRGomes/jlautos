const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email })));

  const bookings = await prisma.booking.findMany();
  console.log("Bookings:", bookings);

  const offers = await prisma.offer.findMany();
  console.log("Offers:", offers);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
