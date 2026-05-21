import prisma from '../config/db';

// ─── Test Drive Repository ────────────────────────────────────────────────────
// Data access layer — keeps business logic separate from DB queries

export const testDriveRepository = {
  /** Check if a vehicle already has an approved/scheduled test drive at same date+time */
  findConflict: (vehicleId: string, date: Date, timeSlot: string, excludeId?: string) =>
    prisma.testDrive.findFirst({
      where: {
        vehicleId,
        testDriveDate: date,
        testDriveTime: timeSlot,
        status: { in: ['SCHEDULED', 'APPROVED'] },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    }),

  /** Create a new test drive record */
  create: (data: {
    userId: string;
    vehicleId: string;
    salesRepId?: string | null;
    testDriveDate: Date;
    testDriveTime: string;
    location: string;
    notes?: string;
  }) =>
    prisma.testDrive.create({
      data,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
    }),

  /** Get all test drives for a specific customer */
  findManyByUser: (userId: string) =>
    prisma.testDrive.findMany({
      where: { userId },
      include: {
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
      orderBy: { testDriveDate: 'asc' },
    }),

  /** Get all test drives (admin ledger) */
  findAll: () =>
    prisma.testDrive.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
      orderBy: { testDriveDate: 'desc' },
    }),

  /** Get a single test drive by ID */
  findById: (id: string) =>
    prisma.testDrive.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
    }),

  /** Update test drive status, adminNotes, and/or salesRepId */
  updateStatus: (
    id: string,
    data: { status: string; adminNotes?: string; salesRepId?: string | null }
  ) =>
    prisma.testDrive.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
    }),

  /** Delete a test drive */
  delete: (id: string) =>
    prisma.testDrive.delete({ where: { id } }),

  /** Count test drives by status */
  countByStatus: (status: string) =>
    prisma.testDrive.count({ where: { status } }),
};
