import bcrypt from 'bcryptjs';
import prisma from './config/db';

const seed = async () => {
  console.log('Starting luxury database seeding operation...');

  try {
    // 1. Clean Database
    await prisma.newsletterBlast.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.offer.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.savedSearch.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
    await prisma.globalSettings.deleteMany();

    console.log('Database cleaned. Setting up corporate parameters...');

    // 2. Global corporate settings
    const settings = await prisma.globalSettings.create({
      data: {
        id: 'global',
        address: '100 Premium Way, Suite 400, Beverly Hills, CA 90210',
        phone: '+1 (214) 608-0670',
        whatsappNumber: '12146080670',
        logoUrl: null,
        operatingHours: JSON.stringify({
          weekdays: '9:00 AM - 6:00 PM',
          saturday: '10:00 AM - 5:00 PM',
          sunday: 'Closed',
        }),
      },
    });
    console.log(' Dealership corporate global metadata saved.');

    // 3. User Seed accounts
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('AdminPassword2026!', salt);
    const customerPass = await bcrypt.hash('CustomerPass2026!', salt);

    // Administrative Profile
    const admin = await prisma.user.create({
      data: {
        email: 'admin@jlautos.com',
        passwordHash: adminPass,
        name: 'James Lord',
        phone: '+1 (310) 555-0101',
        role: 'ADMIN',
      },
    });

    // Registered Customer Profile
    const customer = await prisma.user.create({
      data: {
        email: 'vip.buyer@gmail.com',
        passwordHash: customerPass,
        name: 'Alexander Stone',
        phone: '+1 (415) 555-9080',
        role: 'CUSTOMER',
      },
    });
    console.log(' Setup core access profiles:');
    console.log(`   - ADMIN Account: admin@jlautos.com / AdminPassword2026!`);
    console.log(`   - CUSTOMER Account: vip.buyer@gmail.com / CustomerPass2026!`);

    // 4. Showroom Premium Car Inventory Seed
    // High-definition luxury mock listings
    const vehiclesData = [
      {
        make: 'Porsche',
        model: '911 GT3 RS',
        year: 2024,
        color: 'GT Silver Metallic',
        mileage: 850,
        price: 289900.00,
        transmission: 'Automatic', // PDK
        engine: '4.0L Naturally Aspirated Flat-6',
        fuelType: 'Gasoline',
        bodyStyle: 'Coupe',
        seats: 2,
        doors: 2,
        description: 'Exquisite track-focused precision. Featuring a carbon fiber aero package, active DRS rear wing, Weissach package details, and center-lock magnesium wheels. Pristine condition, single owner.',
        status: 'ON_SALE',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200',
        ]),
        isFinanceWarrantyActive: true,
        financeData: JSON.stringify({
          downpaymentMin: 50000,
          rates: [
            { termMonths: 36, apr: 4.99 },
            { termMonths: 60, apr: 5.99 },
          ],
        }),
        warrantyData: JSON.stringify({
          durationMonths: 48,
          coverageDetails: 'Full Porsche Certified Pre-Owned (CPO) bumper-to-bumper warranty.',
        }),
      },
      {
        make: 'Aston Martin',
        model: 'DBS Superleggera',
        year: 2023,
        color: 'Satin Xenon Grey',
        mileage: 3200,
        price: 315000.00,
        transmission: 'Automatic',
        engine: '5.2L Twin-Turbo V12',
        fuelType: 'Gasoline',
        bodyStyle: 'Coupe',
        seats: 4,
        doors: 2,
        description: 'The ultimate grand tourer. Brutal power matches breathtaking bespoke craftsmanship. Full Bang & Olufsen high-fidelity audio system, carbon-ceramic brakes, and Obsidian Black hand-stitched leather.',
        status: 'ON_SALE',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=1200',
        ]),
        isFinanceWarrantyActive: false,
        financeData: JSON.stringify({
          downpaymentMin: 60000,
          rates: [
            { termMonths: 48, apr: 5.25 },
          ],
        }),
        warrantyData: JSON.stringify({
          durationMonths: 24,
          coverageDetails: 'Aston Martin official extended warranty coverage tier.',
        }),
      },
      {
        make: 'Audi',
        model: 'RS e-tron GT',
        year: 2024,
        color: 'Tactical Green Metallic',
        mileage: 1200,
        price: 147500.00,
        transmission: 'Automatic',
        engine: 'Dual Synchronous Electric Motors (637 hp)',
        fuelType: 'Electric',
        bodyStyle: 'Sedan',
        seats: 5,
        doors: 4,
        description: 'Next-generation grand touring. Electrifying performance meets modern luxury styling. Features carbon fiber roof panel, matrix LED headlights, active air suspension, and premium Nappa leather interiors.',
        status: 'ON_SALE',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1200',
        ]),
        isFinanceWarrantyActive: true,
        financeData: JSON.stringify({
          downpaymentMin: 20000,
          rates: [
            { termMonths: 36, apr: 2.99 },
            { termMonths: 72, apr: 3.99 },
          ],
        }),
        warrantyData: JSON.stringify({
          durationMonths: 96,
          coverageDetails: 'Audi high-voltage battery cell warranty coverage.',
        }),
      },
      {
        make: 'Mercedes-Benz',
        model: 'G 63 AMG',
        year: 2023,
        color: 'G manufaktur Obsidian Black',
        mileage: 5800,
        price: 224000.00,
        transmission: 'Automatic',
        engine: '4.0L Twin-Turbo V8',
        fuelType: 'Gasoline',
        bodyStyle: 'SUV',
        seats: 5,
        doors: 5,
        description: 'Unrivaled status icon. Combining legendary off-road engineering with unmatched AMG racetrack raw performance. Features AMG Night Package, red brake calipers, exclusive interior package, and active dynamic seats.',
        status: 'RESERVED',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1520050206274-a1ae446cb3cc?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1200',
        ]),
        isFinanceWarrantyActive: true,
        financeData: JSON.stringify({
          downpaymentMin: 45000,
          rates: [
            { termMonths: 48, apr: 5.49 },
          ],
        }),
        warrantyData: JSON.stringify({
          durationMonths: 36,
          coverageDetails: 'Factory Mercedes-Benz limited bumper-to-bumper warranty.',
        }),
      },
    ];

    for (const item of vehiclesData) {
      await prisma.vehicle.create({ data: item });
    }

    console.log(` Showroom vehicle models seeded to database.`);
    console.log('Luxury database seeding completed successfully!');
  } catch (err: any) {
    console.error('Seeding critical failure:', err.message);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
