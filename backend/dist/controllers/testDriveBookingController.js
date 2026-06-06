"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBookingDealer = exports.completeBooking = exports.modifyBooking = exports.cancelBookingDealer = exports.rejectBooking = exports.acceptBooking = exports.approveBooking = exports.getDealerBookings = exports.deleteBooking = exports.updateBooking = exports.getMyBookings = exports.createBooking = void 0;
const db_1 = __importDefault(require("../config/db"));
const calendarService_1 = require("../services/calendarService");
const emailService_1 = require("../services/emailService");
const smsService_1 = require("../services/smsService");
/**
 * Validates whether the booking time is within standard business operating hours:
 * Monday to Saturday, 9:00 AM to 6:00 PM. Closed on Sundays.
 */
const isWithinBusinessHours = (dateInput, timeStr) => {
    const date = new Date(dateInput);
    const day = date.getDay();
    if (day === 0) {
        // 0 is Sunday, dealership is closed
        return false;
    }
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match)
        return false;
    let hours = parseInt(match[1], 10);
    const ampm = match[3];
    if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12)
            hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12)
            hours = 0;
    }
    // Hours must be between 9:00 AM (9) and 6:00 PM (18)
    return hours >= 9 && hours < 18;
};
/**
 * Generates a unique 6-character booking reference code, prefixing TDB-.
 */
const generateBookingReference = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let isUnique = false;
    let ref = '';
    while (!isUnique) {
        ref = 'TDB-';
        for (let i = 0; i < 6; i++) {
            ref += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await db_1.default.testDriveBooking.findUnique({
            where: { bookingReference: ref },
        });
        if (!existing)
            isUnique = true;
    }
    return ref;
};
// ─── CUSTOMER CONTROLLERS ───────────────────────────────────────────────────────
/**
 * POST /api/bookings - Schedule vehicle test drive online
 */
const createBooking = async (req, res) => {
    const user = req.user;
    const { vehicleId, bookingDate, bookingTime, fullName, email, mobileNumber, drivingLicenseNumber, customerNotes, notes, // Support "notes" key sent from Details page popup
     } = req.body;
    // Fallback to authenticated user info if not supplied in request body (e.g. details page popup)
    const finalFullName = fullName || user.name || 'VIP Client';
    const finalEmail = email || user.email;
    const finalMobileNumber = mobileNumber || user.phone || '';
    const finalCustomerNotes = customerNotes || notes || '';
    // 1. Required fields validation
    if (!vehicleId || !bookingDate || !bookingTime || !finalFullName || !finalEmail) {
        return res.status(400).json({
            success: false,
            message: 'Vehicle, booking date, booking time, name, and email are required.',
        });
    }
    try {
        // 2. Prevent bookings in the past
        const requestedDate = new Date(bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            return res.status(400).json({ success: false, message: 'Preferred booking date cannot be in the past.' });
        }
        // 3. Validate operating business hours
        if (!isWithinBusinessHours(bookingDate, bookingTime)) {
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is outside operating hours. Business hours are Monday to Saturday, 9:00 AM to 6:00 PM. Closed on Sundays.',
            });
        }
        // 4. Verify vehicle status
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) {
            return res.status(404).json({ success: false, message: 'Vehicle not found.' });
        }
        if (vehicle.status === 'SOLD') {
            return res.status(409).json({ success: false, message: 'This vehicle has already been sold.' });
        }
        // 5. Prevent duplicate bookings for same customer and vehicle at the same date/time
        const duplicate = await db_1.default.testDriveBooking.findFirst({
            where: {
                customerId: user.id,
                vehicleId,
                bookingDate: requestedDate,
                bookingTime,
                status: { notIn: ['Cancelled', 'Rejected'] },
                deletedAt: null,
            },
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active booking for this vehicle at the selected date and time.',
            });
        }
        // 6. Optionally sync customer mobile number/name to User profile
        const dbUser = await db_1.default.user.findUnique({ where: { id: user.id } });
        if (dbUser && finalMobileNumber && (!dbUser.phone || dbUser.phone !== finalMobileNumber)) {
            await db_1.default.user.update({
                where: { id: user.id },
                data: { phone: finalMobileNumber },
            });
        }
        // 7. Format notes to store license
        let notes = finalCustomerNotes || '';
        if (drivingLicenseNumber) {
            notes = `[Driving License: ${drivingLicenseNumber}] ${notes}`.trim();
        }
        // 8. Generate code & insert booking record
        const bookingReference = await generateBookingReference();
        const booking = await db_1.default.testDriveBooking.create({
            data: {
                bookingReference,
                customerId: user.id,
                vehicleId,
                bookingDate: requestedDate,
                bookingTime,
                customerNotes: notes,
                status: 'Pending Approval',
            },
            include: { vehicle: true, customer: true },
        });
        // 9. Audit Logging
        await db_1.default.activityLog.create({
            data: {
                action: 'CREATE_TEST_DRIVE_BOOKING',
                entityType: 'TestDriveBooking',
                entityId: booking.id,
                performedBy: user.id,
            },
        });
        // 10. Dispatches notifications
        const mailData = {
            id: booking.id,
            bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            customerNotes: notes,
        };
        await (0, emailService_1.sendTestDriveCreatedEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveCreatedSMS)(bookingReference, booking.customer.phone);
        }
        return res.status(201).json({
            success: true,
            message: 'Booking request submitted successfully and is awaiting review.',
            data: booking,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create booking.', error: error.message });
    }
};
exports.createBooking = createBooking;
/**
 * GET /api/bookings/my - Get customer's test drive bookings list
 */
const getMyBookings = async (req, res) => {
    const user = req.user;
    try {
        const bookings = await db_1.default.testDriveBooking.findMany({
            where: {
                customerId: user.id,
                deletedAt: null,
            },
            include: {
                vehicle: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: bookings });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to retrieve your bookings.', error: error.message });
    }
};
exports.getMyBookings = getMyBookings;
/**
 * PUT /api/bookings/:id - Customer edits their booking (only allowed if status is Pending Approval or Approved)
 */
const updateBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { bookingDate, bookingTime, drivingLicenseNumber, customerNotes } = req.body;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, customerId: user.id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        // Restrict modifications to Pending / Approved status only
        if (booking.status !== 'Pending Approval' && booking.status !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: 'Modifications are only allowed for bookings with status Pending Approval or Approved.',
            });
        }
        const nextDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
        const nextTime = bookingTime || booking.bookingTime;
        // Validate past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (nextDate < today) {
            return res.status(400).json({ success: false, message: 'Updated booking date cannot be in the past.' });
        }
        // Validate opening hours
        if (!isWithinBusinessHours(nextDate, nextTime)) {
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is outside operating hours. Business hours are Monday to Saturday, 9:00 AM to 6:00 PM. Closed on Sundays.',
            });
        }
        // Check slot duplicate
        const duplicate = await db_1.default.testDriveBooking.findFirst({
            where: {
                customerId: user.id,
                vehicleId: booking.vehicleId,
                bookingDate: nextDate,
                bookingTime: nextTime,
                status: { notIn: ['Cancelled', 'Rejected'] },
                deletedAt: null,
                NOT: { id },
            },
        });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active booking for this vehicle at the updated date and time.',
            });
        }
        let notes = customerNotes || '';
        if (drivingLicenseNumber) {
            notes = `[Driving License: ${drivingLicenseNumber}] ${notes}`.trim();
        }
        // Change status to "Modified by Customer" to alert dealer of changes
        const newStatus = 'Modified by Customer';
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                bookingDate: nextDate,
                bookingTime: nextTime,
                customerNotes: notes,
                status: newStatus,
            },
            include: { vehicle: true, customer: true },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'UPDATE_TEST_DRIVE_BOOKING_CUSTOMER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Notify dealer if booking was modified
        const mailData = {
            id: updated.id,
            bookingReference: updated.bookingReference,
            customerName: updated.customer.name,
            customerEmail: updated.customer.email,
            customerPhone: updated.customer.phone || undefined,
            vehicleDetails: {
                id: updated.vehicle.id,
                make: updated.vehicle.make,
                model: updated.vehicle.model,
                year: updated.vehicle.year,
                price: Number(updated.vehicle.price),
                transmission: updated.vehicle.transmission || '',
                color: updated.vehicle.color,
            },
            bookingDate: updated.bookingDate,
            bookingTime: updated.bookingTime,
            customerNotes: notes,
        };
        // Resend booking creation email alerts to dealership as updated booking
        await (0, emailService_1.sendTestDriveCreatedEmail)(mailData);
        return res.json({
            success: true,
            message: 'Booking updated successfully. A dealership representative will review the updates.',
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update booking.', error: error.message });
    }
};
exports.updateBooking = updateBooking;
/**
 * DELETE /api/bookings/:id - Customer cancels their booking
 */
const deleteBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, customerId: user.id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: { status: 'Cancelled' },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'CANCEL_TEST_DRIVE_BOOKING_CUSTOMER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Send cancel notifications to customer and dealership
        const mailData = {
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            cancellationReason: 'Cancelled by customer via dashboard.',
        };
        await (0, emailService_1.sendTestDriveCancelledEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveCancelledSMS)(booking.bookingReference, booking.customer.phone);
        }
        return res.json({ success: true, message: 'Booking cancelled successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel booking.', error: error.message });
    }
};
exports.deleteBooking = deleteBooking;
// ─── DEALER CONTROLLERS ─────────────────────────────────────────────────────────
/**
 * GET /api/dealer/bookings - List all incoming requests with filters and search
 */
const getDealerBookings = async (req, res) => {
    const { status, search, page = '1', limit = '20' } = req.query;
    const where = { deletedAt: null };
    if (status) {
        if (status === 'Modified') {
            where.status = { startsWith: 'Modified' };
        }
        else {
            where.status = status;
        }
    }
    if (search) {
        const s = String(search);
        where.OR = [
            { customer: { name: { contains: s } } },
            { customer: { email: { contains: s } } },
            { bookingReference: { contains: s } },
            { vehicle: { make: { contains: s } } },
            { vehicle: { model: { contains: s } } },
        ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    try {
        const [bookings, total] = await Promise.all([
            db_1.default.testDriveBooking.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { id: true, name: true, email: true, phone: true } },
                    vehicle: true,
                },
            }),
            db_1.default.testDriveBooking.count({ where }),
        ]);
        return res.json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page: parseInt(page),
                limit: take,
                pages: Math.ceil(total / take),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to list dealer bookings.', error: error.message });
    }
};
exports.getDealerBookings = getDealerBookings;
/**
 * PUT /api/dealer/bookings/:id/approve - Approve request, trigger calendar event, dispatches SMS & email
 */
const approveBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        // Get Dealership Profile parameters for google invite
        const settings = await db_1.default.dealership.findFirst();
        const address = settings?.address || '100 Premium Way, Suite 400, Beverly Hills, CA 90210';
        const contactPhone = settings?.phone || '+1 (214) 608-0670';
        const dealershipName = settings?.name || 'J&L Autos';
        // Calendar payload generator
        const calParams = {
            bookingId: booking.id,
            vehicleName: `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`,
            dealershipName,
            customerName: booking.customer.name,
            date: booking.bookingDate,
            time: booking.bookingTime,
            address,
            contactPhone,
        };
        const googleCalendarLink = (0, calendarService_1.generateGoogleCalendarLink)(calParams);
        const icsContent = (0, calendarService_1.generateICSContent)(calParams);
        // Update status
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                status: 'Approved',
                dealerId: user.id,
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'APPROVE_TEST_DRIVE_BOOKING_DEALER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Notify Customer with ICS Attachment & Google Link
        const mailData = {
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            dealerNotes: booking.dealerNotes || undefined,
            googleCalendarLink,
            icsContent,
        };
        await (0, emailService_1.sendTestDriveApprovedEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveApprovedSMS)(booking.bookingReference, booking.customer.phone);
        }
        return res.json({
            success: true,
            message: 'Booking approved. Calendar invite dispatched.',
            data: updated,
            googleCalendarLink,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to approve booking.', error: error.message });
    }
};
exports.approveBooking = approveBooking;
/**
 * PUT /api/bookings/:id/accept - Customer accepts a dealer-modified booking, triggering approval emails & calendar invites
 */
const acceptBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, customerId: user.id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.status !== 'Modified by Dealer') {
            return res.status(400).json({ success: false, message: 'Only bookings modified by the dealer can be accepted.' });
        }
        const settings = await db_1.default.dealership.findFirst();
        const address = settings?.address || '100 Premium Way, Suite 400, Beverly Hills, CA 90210';
        const contactPhone = settings?.phone || '+1 (214) 608-0670';
        const dealershipName = settings?.name || 'J&L Autos';
        const calParams = {
            bookingId: booking.id,
            vehicleName: `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`,
            dealershipName,
            customerName: booking.customer.name,
            date: booking.bookingDate,
            time: booking.bookingTime,
            address,
            contactPhone,
        };
        const googleCalendarLink = (0, calendarService_1.generateGoogleCalendarLink)(calParams);
        const icsContent = (0, calendarService_1.generateICSContent)(calParams);
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: { status: 'Approved' },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'ACCEPT_TEST_DRIVE_BOOKING_CUSTOMER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        const mailData = {
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            dealerNotes: booking.dealerNotes || undefined,
            googleCalendarLink,
            icsContent,
        };
        await (0, emailService_1.sendTestDriveApprovedEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveApprovedSMS)(booking.bookingReference, booking.customer.phone);
        }
        return res.json({
            success: true,
            message: 'Booking accepted and approved. Calendar invite dispatched.',
            data: updated,
            googleCalendarLink,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to accept booking.', error: error.message });
    }
};
exports.acceptBooking = acceptBooking;
/**
 * PUT /api/dealer/bookings/:id/reject - Reject request with mandatory reason
 */
const rejectBooking = async (req, res) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;
    if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
    }
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                status: 'Rejected',
                rejectionReason,
                dealerId: user.id,
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'REJECT_TEST_DRIVE_BOOKING_DEALER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Notify Customer
        const mailData = {
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            rejectionReason,
        };
        await (0, emailService_1.sendTestDriveRejectedEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveRejectedSMS)(booking.bookingReference, booking.customer.phone);
        }
        return res.json({ success: true, message: 'Booking rejected successfully.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject booking.', error: error.message });
    }
};
exports.rejectBooking = rejectBooking;
/**
 * PUT /api/dealer/bookings/:id/cancel - Dealer cancels booking (reason mandatory)
 */
const cancelBookingDealer = async (req, res) => {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const user = req.user;
    if (!cancellationReason || cancellationReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Cancellation reason is mandatory.' });
    }
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                status: 'Cancelled',
                cancellationReason,
                dealerId: user.id,
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'CANCEL_TEST_DRIVE_BOOKING_DEALER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Notify Customer
        const mailData = {
            id: booking.id,
            bookingReference: booking.bookingReference,
            customerName: booking.customer.name,
            customerEmail: booking.customer.email,
            customerPhone: booking.customer.phone || undefined,
            vehicleDetails: {
                id: booking.vehicle.id,
                make: booking.vehicle.make,
                model: booking.vehicle.model,
                year: booking.vehicle.year,
                price: Number(booking.vehicle.price),
                transmission: booking.vehicle.transmission || '',
                color: booking.vehicle.color,
            },
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            cancellationReason,
        };
        await (0, emailService_1.sendTestDriveCancelledEmail)(mailData);
        if (booking.customer.phone) {
            await (0, smsService_1.sendTestDriveCancelledSMS)(booking.bookingReference, booking.customer.phone);
        }
        return res.json({ success: true, message: 'Booking cancelled by dealer.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel booking.', error: error.message });
    }
};
exports.cancelBookingDealer = cancelBookingDealer;
/**
 * PUT /api/dealer/bookings/:id/modify - Dealer reschedules date/time or assigns a different vehicle
 */
const modifyBooking = async (req, res) => {
    const { id } = req.params;
    const { bookingDate, bookingTime, vehicleId, dealerNotes } = req.body;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
            include: { vehicle: true, customer: true },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const nextDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
        const nextTime = bookingTime || booking.bookingTime;
        const nextVehicleId = vehicleId || booking.vehicleId;
        // Validate past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (nextDate < today) {
            return res.status(400).json({ success: false, message: 'Rescheduled date cannot be in the past.' });
        }
        // Validate opening hours
        if (!isWithinBusinessHours(nextDate, nextTime)) {
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is outside operating hours. Business hours are Monday to Saturday, 9:00 AM to 6:00 PM. Closed on Sundays.',
            });
        }
        // Verify vehicle if changed
        if (vehicleId && vehicleId !== booking.vehicleId) {
            const targetVehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
            if (!targetVehicle) {
                return res.status(404).json({ success: false, message: 'Assigned vehicle not found.' });
            }
            if (targetVehicle.status === 'SOLD') {
                return res.status(409).json({ success: false, message: 'The assigned vehicle has already been sold.' });
            }
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                bookingDate: nextDate,
                bookingTime: nextTime,
                vehicleId: nextVehicleId,
                dealerNotes: dealerNotes || null,
                status: 'Modified by Dealer',
                dealerId: user.id,
            },
            include: { vehicle: true, customer: true },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'MODIFY_TEST_DRIVE_BOOKING_DEALER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        // Generate updated calendar invite
        const settings = await db_1.default.dealership.findFirst();
        const address = settings?.address || '100 Premium Way, Suite 400, Beverly Hills, CA 90210';
        const contactPhone = settings?.phone || '+1 (214) 608-0670';
        const dealershipName = settings?.name || 'J&L Autos';
        const calParams = {
            bookingId: updated.id,
            vehicleName: `${updated.vehicle.year} ${updated.vehicle.make} ${updated.vehicle.model}`,
            dealershipName,
            customerName: updated.customer.name,
            date: updated.bookingDate,
            time: updated.bookingTime,
            address,
            contactPhone,
        };
        const googleCalendarLink = (0, calendarService_1.generateGoogleCalendarLink)(calParams);
        const icsContent = (0, calendarService_1.generateICSContent)(calParams);
        // Notify Customer of Rescheduling
        const mailData = {
            id: updated.id,
            bookingReference: updated.bookingReference,
            customerName: updated.customer.name,
            customerEmail: updated.customer.email,
            customerPhone: updated.customer.phone || undefined,
            vehicleDetails: {
                id: updated.vehicle.id,
                make: updated.vehicle.make,
                model: updated.vehicle.model,
                year: updated.vehicle.year,
                price: Number(updated.vehicle.price),
                transmission: updated.vehicle.transmission || '',
                color: updated.vehicle.color,
            },
            bookingDate: updated.bookingDate,
            bookingTime: updated.bookingTime,
            dealerNotes: dealerNotes || undefined,
            googleCalendarLink,
            icsContent,
        };
        await (0, emailService_1.sendTestDriveModifiedEmail)(mailData);
        if (updated.customer.phone) {
            await (0, smsService_1.sendTestDriveModifiedSMS)(updated.bookingReference, updated.customer.phone);
        }
        return res.json({
            success: true,
            message: 'Booking rescheduled and customer notified.',
            data: updated,
            googleCalendarLink,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to modify booking.', error: error.message });
    }
};
exports.modifyBooking = modifyBooking;
/**
 * PUT /api/dealer/bookings/:id/complete - Complete test drive session
 */
const completeBooking = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: {
                status: 'Completed',
                dealerId: user.id,
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'COMPLETE_TEST_DRIVE_BOOKING_DEALER',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        return res.json({ success: true, message: 'Booking marked as completed.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to complete booking.', error: error.message });
    }
};
exports.completeBooking = completeBooking;
/**
 * DELETE /api/dealer/bookings/:id - Soft delete booking from dealer dashboard (audit logging remains)
 */
const deleteBookingDealer = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    try {
        const booking = await db_1.default.testDriveBooking.findFirst({
            where: { id, deletedAt: null },
        });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        // Rule 3: Admin can only delete resolved bookings
        if (!['Completed', 'Cancelled', 'Rejected'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: `Only resolved bookings (Completed, Cancelled, or Rejected) can be deleted. This booking is currently "${booking.status}".`,
            });
        }
        const updated = await db_1.default.testDriveBooking.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'SOFT_DELETE_TEST_DRIVE_BOOKING',
                entityType: 'TestDriveBooking',
                entityId: id,
                performedBy: user.id,
            },
        });
        return res.json({ success: true, message: 'Booking soft deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to soft delete booking.', error: error.message });
    }
};
exports.deleteBookingDealer = deleteBookingDealer;
//# sourceMappingURL=testDriveBookingController.js.map