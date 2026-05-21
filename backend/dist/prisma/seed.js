"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting JL Autos database seeding...');
    try {
        // Clean DB (order matters due to foreign keys)
        await prisma.activityLog.deleteMany();
        await prisma.testDrive.deleteMany();
        await prisma.booking.deleteMany();
        await prisma.savedSearch.deleteMany();
        await prisma.favorite.deleteMany();
        await prisma.financialTransaction.deleteMany();
        await prisma.saleItem.deleteMany();
        await prisma.sale.deleteMany();
        await prisma.stockMovement.deleteMany();
        await prisma.product.deleteMany();
        await prisma.supplier.deleteMany();
        await prisma.category.deleteMany();
        await prisma.vehicle.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.session.deleteMany();
        await prisma.user.deleteMany();
        console.log('Database cleaned.');
        // 1. Create Default Admin User
        const salt = await bcryptjs_1.default.genSalt(10);
        const adminPass = await bcryptjs_1.default.hash('admin', salt);
        await prisma.user.create({
            data: {
                email: 'admin@jlautos.com',
                passwordHash: adminPass,
                name: 'System Administrator',
                role: 'ADMIN',
                forcePasswordChange: true,
                isActive: true,
            },
        });
        console.log('Admin user created successfully (admin@jlautos.com / admin)');
        // 2. Create Sales User
        const salesPass = await bcryptjs_1.default.hash('sales123', salt);
        await prisma.user.create({
            data: {
                email: 'sales@jlautos.com',
                passwordHash: salesPass,
                name: 'Sales Representative',
                role: 'SALES',
                isActive: true,
            },
        });
        console.log('Sales user created (sales@jlautos.com / sales123)');
        // 3. Create Initial Categories
        await prisma.category.create({ data: { name: 'Auto Parts', description: 'Replacement parts and components' } });
        await prisma.category.create({ data: { name: 'Accessories', description: 'Car accessories and enhancements' } });
        // 4. Create Sample Vehicles
        await prisma.vehicle.create({
            data: {
                make: 'Porsche',
                model: '911 Carrera',
                year: 2024,
                color: 'Black',
                mileage: 0,
                price: 120000.00,
                vin: 'WP0AA299ZRS123456',
                status: 'ON_SALE',
                transmission: 'Automatic',
                engine: '3.0L Twin-Turbo Flat-6',
                fuelType: 'Gasoline',
                bodyStyle: 'Coupe',
                seats: 4,
                doors: 2,
                description: 'Brand new Porsche 911 Carrera with premium package.',
                images: JSON.stringify(['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200']),
            }
        });
        await prisma.vehicle.create({
            data: {
                make: 'BMW',
                model: 'M4 Competition',
                year: 2024,
                color: 'Alpine White',
                mileage: 1500,
                price: 85000.00,
                vin: 'WBS33AZ05RCH12345',
                status: 'ON_SALE',
                transmission: 'Automatic',
                engine: '3.0L Twin-Turbo I6',
                fuelType: 'Gasoline',
                bodyStyle: 'Coupe',
                seats: 4,
                doors: 2,
                description: 'Low mileage BMW M4 Competition xDrive.',
                images: JSON.stringify(['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=1200']),
            }
        });
        console.log('Sample vehicles created.');
        console.log('JL Autos Database seeding completed successfully!');
    }
    catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=seed.js.map