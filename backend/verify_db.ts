import prisma from './src/config/db';

async function verify() {
  const users = await prisma.user.findMany({ include: { bookings: true, offers: true } });
  console.log("Users and their items:");
  for (const u of users) {
    console.log(`User: ${u.email}`);
    console.log(` - Bookings: ${u.bookings.length}`);
    console.log(` - Offers: ${u.offers.length}`);
  }
}
verify().catch(console.error).finally(() => prisma.$disconnect());
