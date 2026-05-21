"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatus = exports.getBookingLedger = exports.getMyBookings = exports.createBooking = void 0;
const db_1 = __importDefault(require("../config/db"));
const emailService_1 = require("../services/emailService");
// 1. Authenticated User Schedules Visit / Test Drive
const createBooking = async (req, res) => {
    const { vehicleId, date, timeSlot, eventType } = req.body;
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required to schedule bookings.' });
    }
    if (!vehicleId || !date || !timeSlot || !eventType) {
        return res.status(400).json({ message: 'Vehicle, Date, Time Slot, and Event Type are required fields.' });
    }
    try {
        // Verify vehicle exists
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) {
            return res.status(404).json({ message: 'Selected vehicle was not found.' });
        }
        // Check if the slot is already booked for this specific vehicle
        const existing = await db_1.default.booking.findFirst({
            where: {
                vehicleId,
                date: new Date(date),
                timeSlot,
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
        });
        if (existing) {
            return res.status(409).json({ message: 'This specific time slot is already reserved for this vehicle.' });
        }
        // Create booking in database
        const booking = await db_1.default.booking.create({
            data: {
                userId: req.user.id,
                vehicleId,
                date: new Date(date),
                timeSlot,
                eventType, // "VISIT" | "TEST_DRIVE"
                status: 'PENDING',
            },
        });
        // Extract detailed user phone/info
        const fullUser = await db_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { name: true, email: true, phone: true }
        });
        // 2. Trigger Automated Dual-Mailing Transaction
        try {
            const mailPayload = {
                customerName: fullUser?.name || req.user.name,
                customerEmail: fullUser?.email || req.user.email,
                customerPhone: fullUser?.phone || undefined,
                vehicleDetails: {
                    id: vehicle.id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    price: vehicle.price,
                    transmission: vehicle.transmission,
                    color: vehicle.color,
                },
                bookingDate: new Date(date),
                timeSlot,
                eventType,
            };
            // Send to J&L Autos Sales Team
            await (0, emailService_1.sendAgencyBookingAlert)(mailPayload);
            // Send to Customer Invoice-style confirmation
            await (0, emailService_1.sendCustomerBookingConfirmation)(mailPayload);
            console.log('[Email Trigger Service] Booking alerts dispatched successfully.');
        }
        catch (mailErr) {
            // Don't fail the response if SMTP fails, but log it
            console.error('[SMTP Alert Trigger Failure]:', mailErr.message);
        }
        return res.status(201).json({
            message: 'Booking scheduled successfully. Confirmation emails dispatched.',
            booking,
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error establishing showroom booking.', error: error.message });
    }
};
exports.createBooking = createBooking;
// 2. Load Bookings For Authenticated Customer Dashboard
const getMyBookings = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required to view your bookings.' });
    }
    try {
        const bookings = await db_1.default.booking.findMany({
            where: { userId: req.user.id },
            include: {
                vehicle: true,
            },
            orderBy: { date: 'asc' },
        });
        const formatted = bookings.map((b) => ({
            ...b,
            vehicle: {
                ...b.vehicle,
                images: JSON.parse(b.vehicle.images),
            },
        }));
        return res.status(200).json({ bookings: formatted });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving user bookings.', error: error.message });
    }
};
exports.getMyBookings = getMyBookings;
// 3. Get All Bookings (Administrative CRM Ledger)
const getBookingLedger = async (req, res) => {
    try {
        const bookings = await db_1.default.booking.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                vehicle: true,
            },
            orderBy: { date: 'desc' },
        });
        const formatted = bookings.map((b) => ({
            ...b,
            vehicle: {
                ...b.vehicle,
                images: JSON.parse(b.vehicle.images),
            },
        }));
        return res.status(200).json({ count: formatted.length, bookings: formatted, ledger: formatted });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error retrieving system bookings ledger.', error: error.message });
    }
};
exports.getBookingLedger = getBookingLedger;
// 4. Update Booking Status (Administrative CRM actions)
const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // "PENDING", "CONFIRMED", "CANCELED"
    if (!status) {
        return res.status(400).json({ message: 'Updated booking status is required.' });
    }
    try {
        const existing = await db_1.default.booking.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Booking entry to update not found.' });
        }
        const updated = await db_1.default.booking.update({
            where: { id },
            data: { status },
            include: {
                user: { select: { name: true, email: true } },
                vehicle: true,
            },
        });
        return res.status(200).json({
            message: `Booking updated to ${status} successfully.`,
            booking: {
                ...updated,
                vehicle: {
                    ...updated.vehicle,
                    images: JSON.parse(updated.vehicle.images),
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating booking status.', error: error.message });
    }
};
exports.updateBookingStatus = updateBookingStatus;
//# sourceMappingURL=bookingController.js.map