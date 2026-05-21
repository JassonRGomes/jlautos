import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendAgencyBookingAlert, sendCustomerBookingConfirmation } from '../services/emailService';
import { sendNewBookingAlertToAgency, sendBookingStatusSMSToCustomer } from '../services/smsService';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Authenticated User Schedules Visit / Test Drive
// ─────────────────────────────────────────────────────────────────────────────
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
        eventType,
        status: 'PENDING',
      },
    });

    // Fetch full user details (name, email, phone)
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true, phone: true },
    });

    const customerName  = fullUser?.name  || req.user.name;
    const customerEmail = fullUser?.email || req.user.email;
    const customerPhone = fullUser?.phone || null;
    const vehicleLabel  = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month:   'short',
      day:     'numeric',
      year:    'numeric',
    });

    // ── Email notifications (fire-and-forget, non-blocking) ─────────────────
    const mailPayload = {
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      vehicleDetails: {
        id:           vehicle.id,
        make:         vehicle.make,
        model:        vehicle.model,
        year:         vehicle.year,
        price:        vehicle.price,
        transmission: vehicle.transmission,
        color:        vehicle.color,
      },
      bookingDate: new Date(date),
      timeSlot,
      eventType,
    };

    Promise.all([
      sendAgencyBookingAlert(mailPayload),
      sendCustomerBookingConfirmation(mailPayload),
    ])
      .then(() => console.log('[Notification] Email alerts dispatched.'))
      .catch((e) => console.error('[Notification] Email dispatch failed:', e.message));

    // ── SMS notification to agency (fire-and-forget) ─────────────────────────
    sendNewBookingAlertToAgency({
      bookingId:    booking.id,
      customerName,
      vehicle:      vehicleLabel,
      date:         formattedDate,
      timeSlot,
      eventType,
    })
      .then((ok) => {
        if (ok) console.log('[SMS] Agency new-booking alert dispatched.');
        else    console.warn('[SMS] Agency new-booking alert not delivered.');
      })
      .catch((e) => console.error('[SMS] Agency alert error:', e.message));

    return res.status(201).json({
      message: 'Booking scheduled successfully. Confirmation emails and SMS dispatched.',
      booking,
      smsDispatched: true,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error establishing showroom booking.', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Load Bookings For Authenticated Customer Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getMyBookings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to view your bookings.' });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: { vehicle: true },
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Get All Bookings (Administrative CRM Ledger)
// ─────────────────────────────────────────────────────────────────────────────
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

    return res.status(200).json({ count: formatted.length, bookings: formatted, ledger: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving system bookings ledger.', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update Booking Status (Administrative CRM actions)
//    Triggers SMS to the customer when CONFIRMED or CANCELED
// ─────────────────────────────────────────────────────────────────────────────
export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id }     = req.params;
  const { status } = req.body; // "PENDING" | "CONFIRMED" | "CANCELED"

  if (!status) {
    return res.status(400).json({ message: 'Updated booking status is required.' });
  }

  const allowedStatuses = ['PENDING', 'CONFIRMED', 'CANCELED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
  }

  try {
    const existing = await prisma.booking.findUnique({
      where: { id },
      include: {
        user:    { select: { name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Booking entry to update not found.' });
    }

    // Prevent updating an already-resolved booking to the same status
    if (existing.status === status) {
      return res.status(409).json({ message: `Booking is already in ${status} state.` });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data:  { status },
      include: {
        user:    { select: { name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    let smsSent = false;
    let smsLog  = 'SMS not triggered (status not CONFIRMED/CANCELED or no customer phone).';

    // ── SMS notification to customer on status change ─────────────────────────
    if (status === 'CONFIRMED' || status === 'CANCELED') {
      const customerPhone = updated.user?.phone || null;

      if (customerPhone) {
        const smsMapped = status === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED';
        try {
          smsSent = await sendBookingStatusSMSToCustomer({
            bookingId:     id,
            customerPhone,
            status:        smsMapped,
          });
          smsLog = smsSent
            ? `SMS dispatched to customer: ${customerPhone}`
            : `SMS delivery failed for: ${customerPhone}`;
          console.log(`[SMS] ${smsLog}`);
        } catch (smsErr: any) {
          smsLog = `SMS error: ${smsErr.message}`;
          console.error('[SMS] Status change SMS failed:', smsErr.message);
        }
      } else {
        smsLog = 'Customer has no phone number registered — SMS skipped.';
        console.warn(`[SMS] ${smsLog}`);
      }
    }

    return res.status(200).json({
      message:    `Booking updated to ${status} successfully.`,
      smsSent,
      smsLog,
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

// ─────────────────────────────────────────────────────────────────────────────
// 5. Get Booking by ID (Admin CRM)
// ─────────────────────────────────────────────────────────────────────────────
export const getBookingById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const formatted = {
      ...booking,
      vehicle: {
        ...booking.vehicle,
        images: JSON.parse(booking.vehicle.images),
      },
    };

    return res.status(200).json({ booking: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving booking.', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Delete Booking (Admin CRM)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    await prisma.booking.delete({ where: { id } });
    return res.status(200).json({ message: 'Booking deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting booking.', error: error.message });
  }
};
