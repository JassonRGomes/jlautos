"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReport = exports.triggerNewsletterBlast = exports.getCustomerRegistry = exports.updateSettings = exports.getSettings = void 0;
const db_1 = __importDefault(require("../config/db"));
const emailService_1 = require("../services/emailService");
const pdf_1 = require("../utils/pdf");
const excel_1 = require("../utils/excel");
// 1. Fetch Global Corporate Settings (Address, Phone, Hours)
const getSettings = async (req, res) => {
    try {
        let settings = await db_1.default.globalSettings.findUnique({ where: { id: 'global' } });
        // Seed defaults if empty
        if (!settings) {
            settings = await db_1.default.globalSettings.create({
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
        }
        const formatted = {
            ...settings,
            operatingHours: JSON.parse(settings.operatingHours),
        };
        return res.status(200).json({ settings: formatted });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving global metadata settings.', error: error.message });
    }
};
exports.getSettings = getSettings;
// 2. Edit Global Corporate Settings (CMS Admin Control)
const updateSettings = async (req, res) => {
    const { address, phone, whatsappNumber, operatingHours, logoUrl } = req.body;
    try {
        const hoursStr = operatingHours
            ? typeof operatingHours === 'object'
                ? JSON.stringify(operatingHours)
                : String(operatingHours)
            : undefined;
        const updated = await db_1.default.globalSettings.upsert({
            where: { id: 'global' },
            create: {
                id: 'global',
                address: address || '100 Premium Way, Beverly Hills, CA',
                phone: phone || '+1 (214) 608-0670',
                whatsappNumber: whatsappNumber || '12146080670',
                logoUrl: logoUrl || null,
                operatingHours: hoursStr || '{}',
            },
            update: {
                address,
                phone,
                whatsappNumber,
                logoUrl: logoUrl !== undefined ? logoUrl : undefined,
                ...(hoursStr && { operatingHours: hoursStr }),
            },
        });
        return res.status(200).json({
            message: 'Dealership global settings saved.',
            settings: {
                ...updated,
                operatingHours: JSON.parse(updated.operatingHours),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error saving settings.', error: error.message });
    }
};
exports.updateSettings = updateSettings;
// 3. Load Customers Directory (CRM Registry panel)
const getCustomerRegistry = async (req, res) => {
    try {
        const customers = await db_1.default.user.findMany({
            where: { role: 'CUSTOMER' },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                createdAt: true,
                _count: {
                    select: {
                        bookings: true,
                        offers: true,
                        favorites: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ count: customers.length, registry: customers });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error loading user directories.', error: error.message });
    }
};
exports.getCustomerRegistry = getCustomerRegistry;
// 4. Newsletter Hub Trigger: Blast Transactional Announcements
const triggerNewsletterBlast = async (req, res) => {
    const { vehicleId } = req.body;
    if (!vehicleId) {
        return res.status(400).json({ message: 'A vehicle target is required for newsletter blasts.' });
    }
    try {
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) {
            return res.status(404).json({ message: 'Target vehicle for blast was not found.' });
        }
        // Load registered customers emails
        const customers = await db_1.default.user.findMany({
            where: { role: 'CUSTOMER' },
            select: { email: true },
        });
        if (customers.length === 0) {
            return res.status(200).json({ message: 'Newsletter blast target empty. No customers registered in system directory.' });
        }
        const emailList = customers.map((c) => c.email);
        const firstImage = JSON.parse(vehicle.images)[0] || '';
        // Trigger Nodemailer portfolio email dispatch
        await (0, emailService_1.blastVehicleNewsletter)({
            vehicleDetails: {
                id: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                price: vehicle.price,
                transmission: vehicle.transmission,
                color: vehicle.color,
                image: firstImage,
                description: vehicle.description,
            },
            recipients: emailList,
        });
        // Record the blast sent log
        const log = await db_1.default.newsletterBlast.create({
            data: {
                vehicleId,
                recipientCount: emailList.length,
            },
        });
        return res.status(200).json({
            message: `Newsletter portfolio blast sent successfully to ${emailList.length} registered customers.`,
            log,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error executing transactional newsletter blast.', error: error.message });
    }
};
exports.triggerNewsletterBlast = triggerNewsletterBlast;
// 5. Reports Engine: Generates Clean Printable PDF or Excel sheets
const exportReport = async (req, res) => {
    const { format, type } = req.query; // format: "pdf" | "excel", type: "inventory" | "leads" | "sales"
    if (!format || !type) {
        return res.status(400).json({ message: 'Report format (pdf/excel) and type (inventory/leads/sales) are required.' });
    }
    try {
        // Fetch global settings to get logoUrl
        const settings = await db_1.default.globalSettings.findUnique({ where: { id: 'global' } });
        const logoUrl = settings?.logoUrl || null;
        if (type === 'inventory') {
            const vehicles = await db_1.default.vehicle.findMany({ orderBy: { make: 'asc' } });
            const valuation = vehicles.reduce((sum, v) => sum + v.price, 0);
            const headers = ['Make', 'Model', 'Year', 'Mileage', 'Valuation Price', 'Badge Status'];
            const rows = vehicles.map((v) => [
                v.make,
                v.model,
                String(v.year),
                `${v.mileage.toLocaleString()} mi`,
                `$${v.price.toLocaleString()}`,
                v.status,
            ]);
            const title = 'Inventory & Valuation Report';
            const summaryText = `Total Inventory Count: ${vehicles.length} listings. Total Dealership Assets Book Valuation: $${valuation.toLocaleString()}`;
            if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="inventory_valuation_report.pdf"');
                const colWidths = [70, 110, 50, 75, 100, 90];
                await (0, pdf_1.generatePDFReport)(res, title, headers, rows, summaryText, logoUrl, colWidths);
            }
            else {
                await (0, excel_1.generateExcelReport)(res, 'Showroom Inventory', headers, rows, 'inventory_valuation_report.xlsx');
            }
        }
        else if (type === 'leads') {
            const bookings = await db_1.default.booking.findMany({
                include: { user: true, vehicle: true },
                orderBy: { date: 'desc' },
            });
            const headers = ['Customer Name', 'Contact Info', 'Scheduled Date/Slot', 'Event Class', 'Motorcar Target', 'Booking Status'];
            const rows = bookings.map((b) => [
                b.user.name,
                `${b.user.email}${b.user.phone ? ` / ${b.user.phone}` : ''}`,
                `${new Date(b.date).toLocaleDateString()} at ${b.timeSlot}`,
                b.eventType === 'TEST_DRIVE' ? 'TEST DRIVE' : 'SHOWROOM VISIT',
                `${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model}`,
                b.status,
            ]);
            const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
            const title = 'Showroom Active Customer Leads';
            const summaryText = `Total Leads Registered: ${bookings.length} scheduling appointments. Pending Action Actions: ${pendingCount} slots under CRM review.`;
            if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="active_customer_leads.pdf"');
                const colWidths = [80, 120, 100, 70, 75, 50];
                await (0, pdf_1.generatePDFReport)(res, title, headers, rows, summaryText, logoUrl, colWidths);
            }
            else {
                await (0, excel_1.generateExcelReport)(res, 'Active Customer Leads', headers, rows, 'active_customer_leads.xlsx');
            }
        }
        else if (type === 'sales') {
            const offers = await db_1.default.offer.findMany({
                where: { status: 'ACCEPTED' },
                include: { user: true, vehicle: true },
                orderBy: { updatedAt: 'desc' },
            });
            const totalRevenue = offers.reduce((sum, o) => sum + o.offerAmount, 0);
            const headers = ['Buyer Profile', 'Dealership Asset', 'Dealership Valuation', 'Accepted Offer Amount', 'Closing Date'];
            const rows = offers.map((o) => [
                o.user.name,
                `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}`,
                `$${o.vehicle.price.toLocaleString()}`,
                `$${o.offerAmount.toLocaleString()}`,
                new Date(o.updatedAt).toLocaleDateString(),
            ]);
            const title = 'Period Sales Performance Report';
            const summaryText = `Total Completed Acquisitions: ${offers.length} sold motorcars. Total Dealership Revenue Volume closed: $${totalRevenue.toLocaleString()}`;
            if (format === 'pdf') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="sales_performance_report.pdf"');
                const colWidths = [95, 130, 95, 95, 80];
                await (0, pdf_1.generatePDFReport)(res, title, headers, rows, summaryText, logoUrl, colWidths);
            }
            else {
                await (0, excel_1.generateExcelReport)(res, 'Sales Performance', headers, rows, 'sales_performance_report.xlsx');
            }
        }
        else {
            return res.status(400).json({ message: 'Invalid report type requested.' });
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Error generating printable reports.', error: error.message });
    }
};
exports.exportReport = exportReport;
//# sourceMappingURL=settingsController.js.map