import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config(); // Ensure env vars are loaded

const prisma = new PrismaClient();

async function main() {
  try {
    const dealership = await prisma.dealership.findFirst({ where: { status: 'ACTIVE' } });
    if (dealership) {
      console.log("Updating existing dealership", dealership.id);
      const updated = await prisma.dealership.update({
        where: { id: dealership.id },
        data: {
          address: "100 Premium Way, Suite 400, Beverly Hills, CA 90210",
          phone: "+1 (214) 608-0670",
          whatsappNumber: "12146080670",
          logoUrl: "/uploads/jl_1712345678_123456789.webp",
          operatingHours: JSON.stringify({
            weekdays: "9:00 AM - 6:00 PM",
            saturday: "10:00 AM - 5:00 PM",
            sunday: "Closed"
          }),
        },
      });
      console.log("Updated successfully");
    } else {
      console.log("Creating new dealership");
      const created = await prisma.dealership.create({
        data: {
          name: 'J&L Autos',
          status: 'ACTIVE',
          address: "100 Premium Way, Suite 400, Beverly Hills, CA 90210",
          phone: "+1 (214) 608-0670",
          whatsappNumber: "12146080670",
          logoUrl: "/uploads/jl_1712345678_123456789.webp",
          operatingHours: JSON.stringify({
            weekdays: "9:00 AM - 6:00 PM",
            saturday: "10:00 AM - 5:00 PM",
            sunday: "Closed"
          }),
        },
      });
      console.log("Created successfully");
    }
  } catch (error: any) {
    console.error("Prisma Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
