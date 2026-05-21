import prisma from '../config/db';

// ─── Booking Repository ───────────────────────────────────────────────────────
// Data access layer — keeps business logic separate from DB queries

export const bookingRepository = {
  /** Check if a slot is already taken for a given vehicle */
  findConflict: (vehicleId: string, date: Date, timeSlot: string, excludeId?: string) =>
    prisma.booking.findFirst({
      where: {
        vehicleId,
        date,
        timeSlot,
        status: { in: ['PENDING', 'CONFIRMED'] },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    }),

  /** Create a new booking record */
  create: (data: {
    userId: string;
    vehicleId: string;
    date: Date;
    timeSlot: string;
    eventType: string;
    notes?: string;
  }) =>
    prisma.booking.create({ data }),

  /** Get all bookings for a specific user */
  findManyByUser: (userId: string) =>
    prisma.booking.findMany({
      where: { userId },
      include: { vehicle: true },
      orderBy: { date: 'asc' },
    }),

  /** Get all bookings (admin ledger view) */
  findAll: () =>
    prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
      orderBy: { date: 'desc' },
    }),

  /** Get a single booking by ID */
  findById: (id: string) =>
    prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
    }),

  /** Update booking status (and optional notes) */
  updateStatus: (id: string, status: string, notes?: string) =>
    prisma.booking.update({
      where: { id },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
    }),

  /** Delete a booking */
  delete: (id: string) =>
    prisma.booking.delete({ where: { id } }),

  /** Count bookings by status */
  countByStatus: (status: string) =>
    prisma.booking.count({ where: { status } }),
};
