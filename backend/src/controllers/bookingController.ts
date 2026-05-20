import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendAgencyBookingAlert, sendCustomerBookingConfirmation } from '../services/emailService';

// 1. Authenticated User Schedules Visit / Test Drive
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId, date, timeSlot, eventType } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to schedule bookings.' });
  }

  if (!vehicleId || !date || !timeSlot || !eventType) {
    return res.status(400).json({ message: 'Vehicle, Date, Time Slot, and Event Type are required fields.' });
  }

  try {
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Selected vehicle was not found.' });
    }

    // Check if the slot is already booked for this specific vehicle
    const existing = await prisma.booking.findFirst({
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
    const booking = await prisma.booking.create({
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
    const fullUser = await prisma.user.findUnique({
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
      await sendAgencyBookingAlert(mailPayload);
      // Send to Customer Invoice-style confirmation
      await sendCustomerBookingConfirmation(mailPayload);
      console.log('[Email Trigger Service] Booking alerts dispatched successfully.');
    } catch (mailErr: any) {
      // Don't fail the response if SMTP fails, but log it
      console.error('[SMTP Alert Trigger Failure]:', mailErr.message);
    }

    return res.status(201).json({
      message: 'Booking scheduled successfully. Confirmation emails dispatched.',
      booking,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error establishing showroom booking.', error: error.message });
  }
};

// 2. Load Bookings For Authenticated Customer Dashboard
export const getMyBookings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to view your bookings.' });
  }

  try {
    const bookings = await prisma.booking.findMany({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving user bookings.', error: error.message });
  }
};

// 3. Get All Bookings (Administrative CRM Ledger)
export const getBookingLedger = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
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

    return res.status(200).json({ count: formatted.length, ledger: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving system bookings ledger.', error: error.message });
  }
};

// 4. Update Booking Status (Administrative CRM actions)
export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // "PENDING", "CONFIRMED", "CANCELED"

  if (!status) {
    return res.status(400).json({ message: 'Updated booking status is required.' });
  }

  try {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Booking entry to update not found.' });
    }

    const updated = await prisma.booking.update({
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error updating booking status.', error: error.message });
  }
};
