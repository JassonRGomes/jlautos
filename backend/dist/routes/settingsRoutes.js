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
        return res.status(404).json({ success: false, message: 'Active dealership not found.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update settings.', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map