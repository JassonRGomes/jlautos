"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBooking = exports.updateBooking = exports.createBooking = exports.getBookingById = exports.getBookings = void 0;
const db_1 = __importDefault(require("../config/db"));
// GET /bookings - List bookings (admin: all, user: own)
const getBookings = async (req, res) => {
    const user = req.user;
    const { status, vehicleId, page = '1', limit = '20' } = req.query;
    const where = {};
    if (user.role === 'CUSTOMER')
        where.userId = user.id;
    if (status)
        where.status = status;
    if (vehicleId)
        where.vehicleId = vehicleId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    try {
        const [bookings, total] = await Promise.all([
            db_1.default.booking.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true, phone: true } },
                    vehicle: { select: { id: true, make: true, model: true, year: true, color: true, images: true } },
                },
            }),
            db_1.default.booking.count({ where }),
        ]);
        return res.json({
            success: true,
            data: bookings,
            pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch bookings.', error: error.message });
    }
};
exports.getBookings = getBookings;
// GET /bookings/:id - Single booking detail
const getBookingById = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.booking.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                vehicle: { select: { id: true, make: true, model: true, year: true, color: true, price: true, images: true } },
            },
        });
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        if (user.role === 'CUSTOMER' && booking.userId !== user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        return res.json({ success: true, data: booking });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch booking.', error: error.message });
    }
};
exports.getBookingById = getBookingById;
// POST /bookings - Create new booking
const createBooking = async (req, res) => {
    const user = req.user;
    const { vehicleId, bookingDate, bookingTime, notes } = req.body;
    if (!vehicleId || !bookingDate || !bookingTime) {
        return res.status(400).json({ success: false, message: 'vehicleId, bookingDate, and bookingTime are required.' });
    }
    try {
        // Check vehicle exists
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle)
            return res.status(404).json({ success: false, message: 'Vehicle not found.' });
        if (vehicle.status === 'SOLD')
            return res.status(409).json({ success: false, message: 'Vehicle is already sold.' });
        // Conflict: same vehicle, same date/time, active booking
        const conflict = await db_1.default.booking.findFirst({
            where: {
                vehicleId,
                bookingDate: new Date(bookingDate),
                bookingTime,
                status: { in: ['pending', 'confirmed'] },
            },
        });
        if (conflict) {
            return res.status(409).json({ success: false, message: 'This vehicle is already booked at the selected date and time.' });
        }
        // Prevent user from having multiple active bookings for same vehicle
        const existingUserBooking = await db_1.default.booking.findFirst({
            where: { userId: user.id, vehicleId, status: { in: ['pending', 'confirmed'] } },
        });
        if (existingUserBooking) {
            return res.status(409).json({ success: false, message: 'You already have an active booking for this vehicle.' });
        }
        const booking = await db_1.default.booking.create({
            data: {
                userId: user.id,
                vehicleId,
                bookingDate: new Date(bookingDate),
                bookingTime,
                notes,
                status: 'pending',
            },
            include: {
                vehicle: { select: { make: true, model: true, year: true } },
            },
        });
        // Log activity
        await db_1.default.activityLog.create({
            data: {
                action: 'CREATE_BOOKING',
                entityType: 'Booking',
                entityId: booking.id,
                performedBy: user.id,
            },
        });
        return res.status(201).json({ success: true, message: 'Booking created successfully.', data: booking });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create booking.', error: error.message });
    }
};
exports.createBooking = createBooking;
// PUT /bookings/:id - Update booking (admin: any field; customer: cancel only)
const updateBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { status, bookingDate, bookingTime, notes } = req.body;
    try {
        const booking = await db_1.default.booking.findUnique({ where: { id } });
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        // Customers can only cancel their own bookings
        if (user.role === 'CUSTOMER') {
            if (booking.userId !== user.id)
                return res.status(403).json({ success: false, message: 'Access denied.' });
            if (status && status !== 'cancelled')
                return res.status(403).json({ success: false, message: 'Customers can only cancel bookings.' });
        }
        const updates = {};
        if (status)
            updates.status = status;
        if (bookingDate)
            updates.bookingDate = new Date(bookingDate);
        if (bookingTime)
            updates.bookingTime = bookingTime;
        if (notes !== undefined)
            updates.notes = notes;
        // Re-check conflict if date/time changes
        if (bookingDate || bookingTime) {
            const newDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
            const newTime = bookingTime || booking.bookingTime;
            const conflict = await db_1.default.booking.findFirst({
                where: {
                    vehicleId: booking.vehicleId,
                    bookingDate: newDate,
                    bookingTime: newTime,
                    status: { in: ['pending', 'confirmed'] },
                    NOT: { id },
                },
            });
            if (conflict)
                return res.status(409).json({ success: false, message: 'This time slot is already taken.' });
        }
        const updated = await db_1.default.booking.update({ where: { id }, data: updates });
        // Log activity
        await db_1.default.activityLog.create({
            data: {
                action: `UPDATE_BOOKING_${(status || 'EDITED').toUpperCase()}`,
                entityType: 'Booking',
                entityId: id,
                performedBy: user.id,
            },
        });
        return res.json({ success: true, message: 'Booking updated successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update booking.', error: error.message });
    }
};
exports.updateBooking = updateBooking;
// DELETE /bookings/:id - Hard delete (admin only)
const deleteBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.booking.findUnique({ where: { id } });
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        await db_1.default.booking.delete({ where: { id } });
        await db_1.default.activityLog.create({
            data: { action: 'DELETE_BOOKING', entityType: 'Booking', entityId: id, performedBy: user.id },
        });
        return res.json({ success: true, message: 'Booking deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete booking.', error: error.message });
    }
};
exports.deleteBooking = deleteBooking;
//# sourceMappingURL=bookingController.js.map