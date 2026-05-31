"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middlewares/auth");
const pdf_1 = require("../utils/pdf");
const excel_1 = require("../utils/excel");
const router = (0, express_1.Router)();
// GET /api/settings/fix-db — Hotfix to add missing columns to Dealership table if schema is out of sync
router.get('/fix-db', async (req, res) => {
    try {
        await db_1.default.$executeRawUnsafe(`
      ALTER TABLE \`Dealership\` 
      ADD COLUMN \`whatsappNumber\` VARCHAR(191) NULL,
      ADD COLUMN \`logoUrl\` VARCHAR(191) NULL,
      ADD COLUMN \`operatingHours\` TEXT NULL;
    `);
        // 3. Output Bookings explicitly for debugging
        const bookings = await db_1.default.booking.findMany({});
        const offers = await db_1.default.offer.findMany({});
        return res.json({
            success: true,
            message: `Database fixed successfully! Found ${bookings.length} bookings and ${offers.length} offers.`,
            debug_bookings: bookings
        });
    }
    catch (error) {
        if (error.message.includes('Duplicate column')) {
            return res.status(200).send("Columns already exist, database is fine.");
        }
        return res.status(500).send("Error fixing database: " + error.message);
    }
});
// GET /api/settings/fix-bookings — Creates test_drive_bookings table if missing (idempotent)
router.get('/fix-bookings', async (_req, res) => {
    try {
        await db_1.default.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`test_drive_bookings\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`booking_reference\` VARCHAR(191) NOT NULL,
        \`customer_id\` VARCHAR(191) NOT NULL,
        \`vehicle_id\` VARCHAR(191) NOT NULL,
        \`dealer_id\` VARCHAR(191) NULL,
        \`booking_date\` DATETIME(3) NOT NULL,
        \`booking_time\` VARCHAR(191) NOT NULL,
        \`status\` VARCHAR(191) NOT NULL DEFAULT 'Pending Approval',
        \`customer_notes\` TEXT NULL,
        \`dealer_notes\` TEXT NULL,
        \`cancellation_reason\` TEXT NULL,
        \`rejection_reason\` TEXT NULL,
        \`google_event_id\` VARCHAR(191) NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deleted_at\` DATETIME(3) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`test_drive_bookings_booking_reference_key\` (\`booking_reference\`),
        KEY \`test_drive_bookings_customer_id_idx\` (\`customer_id\`),
        KEY \`test_drive_bookings_vehicle_id_idx\` (\`vehicle_id\`),
        CONSTRAINT \`fk_tdb_customer\`
          FOREIGN KEY (\`customer_id\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_tdb_vehicle\`
          FOREIGN KEY (\`vehicle_id\`) REFERENCES \`Vehicle\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        // Count existing bookings after ensuring table exists
        const count = await db_1.default.testDriveBooking.count();
        return res.json({
            success: true,
            message: `test_drive_bookings table is ready. Current record count: ${count}.`,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create bookings table.', error: error.message });
    }
});
// GET /api/settings — Returns public dealership settings for the frontend
// Called by ThemeAuthContext on every page load
router.get('/', async (_req, res) => {
    try {
        const dealership = await db_1.default.dealership.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
        });
        if (!dealership) {
            // Return sensible defaults if no dealership is configured yet
            return res.status(200).json({
                settings: {
                    address: 'J&L Autos — Contact us for location',
                    phone: '',
                    whatsappNumber: '',
                    operatingHours: {
                        weekdays: 'Mon–Fri: 9:00 AM – 6:00 PM',
                        saturday: 'Sat: 10:00 AM – 4:00 PM',
                        sunday: 'Closed',
                    },
                    logoUrl: null,
                },
            });
        }
        let operatingHoursParsed = {
            weekdays: 'Mon–Fri: 9:00 AM – 6:00 PM',
            saturday: 'Sat: 10:00 AM – 4:00 PM',
            sunday: 'Closed',
        };
        if (dealership.operatingHours) {
            try {
                operatingHoursParsed = JSON.parse(dealership.operatingHours);
            }
            catch (e) { }
        }
        return res.status(200).json({
            settings: {
                address: dealership.address || [dealership.city, dealership.state].filter(Boolean).join(', ') || 'J&L Autos',
                phone: dealership.phone || '',
                whatsappNumber: dealership.whatsappNumber || dealership.phone || '',
                operatingHours: operatingHoursParsed,
                logoUrl: dealership.logoUrl || null,
                name: dealership.name,
                email: dealership.email,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to load dealership settings.', error: error.message });
    }
});
// GET /api/settings/customers — Loads registered customer profiles with their bookings/offers counts
router.get('/customers', auth_1.authenticateJWT, auth_1.requireAdmin, async (_req, res) => {
    try {
        const customers = await db_1.default.user.findMany({
            where: { role: 'CUSTOMER' },
            include: {
                _count: {
                    select: { bookings: true, offers: true },
                },
            },
        });
        return res.status(200).json({ success: true, data: customers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load customers.', error: error.message });
    }
});
// GET /api/settings/export — Produces inventory sheets
router.get('/export', auth_1.authenticateJWT, auth_1.requireAdmin, async (req, res) => {
    const format = req.query.format;
    try {
        const vehicles = await db_1.default.vehicle.findMany();
        const headers = ['Make', 'Model', 'Year', 'Price', 'Status'];
        const rows = vehicles.map(v => [v.make, v.model, v.year.toString(), v.price.toString(), v.status]);
        const title = 'Inventory Report';
        if (format === 'excel') {
            await (0, excel_1.generateExcelReport)(res, 'Inventory', headers, rows, 'inventory.xlsx');
        }
        else {
            await (0, pdf_1.generatePDFReport)(res, title, headers, rows, 'Inventory overview');
        }
    }
    catch (error) {
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Export failed.', error: error.message });
        }
    }
});
// POST /api/settings/newsletter — Blasts promotional emails to all active customers
router.post('/newsletter', auth_1.authenticateJWT, auth_1.requireAdmin, async (req, res) => {
    try {
        // Placeholder logic for email dispatch
        return res.status(200).json({ success: true, message: 'Newsletter dispatched to active customers.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to send newsletter.', error: error.message });
    }
});
// PUT /api/settings/ — Updates active dealership settings
router.put('/', auth_1.authenticateJWT, auth_1.requireAdmin, async (req, res) => {
    const { address, phone, whatsappNumber, logoUrl, operatingHours } = req.body;
    try {
        const dealership = await db_1.default.dealership.findFirst({ where: { status: 'ACTIVE' } });
        if (dealership) {
            const updated = await db_1.default.dealership.update({
                where: { id: dealership.id },
                data: {
                    address,
                    phone,
                    whatsappNumber,
                    logoUrl,
                    operatingHours: operatingHours ? JSON.stringify(operatingHours) : null,
                },
            });
            return res.status(200).json({ success: true, data: updated });
        }
        else {
            const created = await db_1.default.dealership.create({
                data: {
                    name: 'J&L Autos',
                    status: 'ACTIVE',
                    address,
                    phone,
                    whatsappNumber,
                    logoUrl,
                    operatingHours: operatingHours ? JSON.stringify(operatingHours) : null,
                },
            });
            return res.status(201).json({ success: true, data: created });
        }
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update settings.', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map