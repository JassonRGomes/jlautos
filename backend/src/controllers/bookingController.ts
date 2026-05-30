import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendBookingStatusSMSToCustomer } from '../services/smsService';

// GET /bookings - List bookings (admin: all, user: own)
export const getBookings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, vehicleId, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (user.role === 'CUSTOMER') where.userId = user.id;
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          vehicle: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return res.json({
      success: true,
      data: bookings,
      pagination: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch bookings.', error: error.message });
  }
};

// GET /bookings/:id - Single booking detail
export const getBookingById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (user.role === 'CUSTOMER' && booking.userId !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch booking.', error: error.message });
  }
};

// POST /bookings - Create new booking
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { vehicleId, bookingDate, bookingTime, notes } = req.body;

  if (!vehicleId || !bookingDate || !bookingTime) {
    return res.status(400).json({ success: false, message: 'vehicleId, bookingDate, and bookingTime are required.' });
  }

  try {
    // Check vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    if (vehicle.status === 'SOLD') return res.status(409).json({ success: false, message: 'Vehicle is already sold.' });

    // Conflict: same vehicle, same date/time, active booking
    const conflict = await prisma.booking.findFirst({
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
    const existingUserBooking = await prisma.booking.findFirst({
      where: { userId: user.id, vehicleId, status: { in: ['pending', 'confirmed'] } },
    });
    if (existingUserBooking) {
      return res.status(409).json({ success: false, message: 'You already have an active booking for this vehicle.' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        vehicleId,
        bookingDate: new Date(bookingDate),
        bookingTime,
        notes,
        status: 'pending',
      },
      include: {
        vehicle: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'CREATE_BOOKING',
        entityType: 'Booking',
        entityId: booking.id,
        performedBy: user.id,
      },
    });

    return res.status(201).json({ success: true, message: 'Booking created successfully.', data: booking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create booking.', error: error.message });
  }
};

// PUT /bookings/:id - Update booking (admin: any field; customer: cancel only)
export const updateBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { status, bookingDate, bookingTime, notes } = req.body;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Customers can only cancel their own bookings
    if (user.role === 'CUSTOMER') {
      if (booking.userId !== user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
      if (status && status !== 'cancelled') return res.status(403).json({ success: false, message: 'Customers can only cancel bookings.' });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (bookingDate) updates.bookingDate = new Date(bookingDate);
    if (bookingTime) updates.bookingTime = bookingTime;
    if (notes !== undefined) updates.notes = notes;

    // Re-check conflict if date/time changes
    if (bookingDate || bookingTime) {
      const newDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
      const newTime = bookingTime || booking.bookingTime;
      const conflict = await prisma.booking.findFirst({
        where: {
          vehicleId: booking.vehicleId,
          bookingDate: newDate,
          bookingTime: newTime,
          status: { in: ['pending', 'confirmed'] },
          NOT: { id },
        },
      });
      if (conflict) return res.status(409).json({ success: false, message: 'This time slot is already taken.' });
    }

    const updated = await prisma.booking.update({ where: { id }, data: updates });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: `UPDATE_BOOKING_${(status || 'EDITED').toUpperCase()}`,
        entityType: 'Booking',
        entityId: id,
        performedBy: user.id,
      },
    });

    return res.json({ success: true, message: 'Booking updated successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update booking.', error: error.message });
  }
};

// DELETE /bookings/:id - Hard delete (admin only)
export const deleteBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    await prisma.booking.delete({ where: { id } });

    await prisma.activityLog.create({
      data: { action: 'DELETE_BOOKING', entityType: 'Booking', entityId: id, performedBy: user.id },
    });

    return res.json({ success: true, message: 'Booking deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete booking.', error: error.message });
  }
};

// PATCH /bookings/:id/status - Update booking status and notify via SMS
export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { status } = req.body;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    const updated = await prisma.booking.update({ where: { id }, data: { status } });

    let smsSent = false;
    let smsLog = null;

    if (['confirmed', 'cancelled'].includes(status) && booking.user.phone) {
      const smsStatus = status === 'confirmed' ? 'CONFIRMED' : 'CANCELLED';
      try {
        smsSent = await sendBookingStatusSMSToCustomer({
          bookingId: booking.id,
          customerPhone: booking.user.phone,
          status: smsStatus
        });
        smsLog = smsSent ? `SMS sent for status ${status}` : `SMS mock dispatch for ${status}`;
      } catch (err: any) {
        smsLog = err.message;
      }
    }

    await prisma.activityLog.create({
      data: {
        action: `UPDATE_BOOKING_STATUS_${status.toUpperCase()}`,
        entityType: 'Booking',
        entityId: id,
        performedBy: user.id,
      },
    });

    return res.json({ success: true, message: 'Booking status updated.', data: updated, smsSent, smsLog });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update booking status.', error: error.message });
  }
};
