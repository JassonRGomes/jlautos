import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// GET /test-drives - List test drives
export const getTestDrives = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, vehicleId, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (user.role === 'CUSTOMER') where.userId = user.id;
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  try {
    const [testDrives, total] = await Promise.all([
      prisma.testDrive.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          vehicle: true,
          salesRep: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.testDrive.count({ where }),
    ]);

    return res.json({
      success: true,
      data: testDrives,
      pagination: { total, page: parseInt(page as string), limit: take, pages: Math.ceil(total / take) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch test drives.', error: error.message });
  }
};

// GET /test-drives/:id
export const getTestDriveById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const testDrive = await prisma.testDrive.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        salesRep: { select: { id: true, name: true, email: true } },
      },
    });

    if (!testDrive) return res.status(404).json({ success: false, message: 'Test drive not found.' });
    if (user.role === 'CUSTOMER' && testDrive.userId !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, data: testDrive });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch test drive.', error: error.message });
  }
};

// POST /test-drives - Schedule test drive
export const createTestDrive = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { vehicleId, testDriveDate, testDriveTime, location, salesRepresentativeId, notes } = req.body;

  if (!vehicleId || !testDriveDate || !testDriveTime) {
    return res.status(400).json({ success: false, message: 'vehicleId, testDriveDate, and testDriveTime are required.' });
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    if (vehicle.status === 'SOLD') return res.status(409).json({ success: false, message: 'Vehicle is already sold.' });

    // Check slot conflict
    const conflict = await prisma.testDrive.findFirst({
      where: {
        vehicleId,
        testDriveDate: new Date(testDriveDate),
        testDriveTime,
        status: { in: ['scheduled', 'approved'] },
      },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'This vehicle already has a test drive scheduled at this date and time.' });
    }



    const testDrive = await prisma.testDrive.create({
      data: {
        userId: user.id,
        vehicleId,
        testDriveDate: new Date(testDriveDate),
        testDriveTime,
        location: location || 'Dealership',
        salesRepresentativeId: salesRepresentativeId || null,
        notes: notes || null,
        status: 'scheduled',
      },
      include: {
        vehicle: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'CREATE_TEST_DRIVE',
        entityType: 'TestDrive',
        entityId: testDrive.id,
        performedBy: user.id,
      },
    });

    return res.status(201).json({ success: true, message: 'Test drive scheduled successfully.', data: testDrive });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to schedule test drive.', error: error.message });
  }
};

// PUT /test-drives/:id - Update (admin: any; customer: cancel only)
export const updateTestDrive = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { status, testDriveDate, testDriveTime, location, salesRepresentativeId, notes } = req.body;

  try {
    const testDrive = await prisma.testDrive.findUnique({ where: { id } });
    if (!testDrive) return res.status(404).json({ success: false, message: 'Test drive not found.' });

    if (user.role === 'CUSTOMER') {
      if (testDrive.userId !== user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
      if (status && status !== 'cancelled') return res.status(403).json({ success: false, message: 'Customers can only cancel test drives.' });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (testDriveDate) updates.testDriveDate = new Date(testDriveDate);
    if (testDriveTime) updates.testDriveTime = testDriveTime;
    if (location) updates.location = location;
    if (salesRepresentativeId !== undefined) updates.salesRepresentativeId = salesRepresentativeId;
    if (notes !== undefined) updates.notes = notes;

    const updated = await prisma.testDrive.update({ where: { id }, data: updates });

    await prisma.activityLog.create({
      data: {
        action: `UPDATE_TEST_DRIVE_${(status || 'EDITED').toUpperCase()}`,
        entityType: 'TestDrive',
        entityId: id,
        performedBy: user.id,
      },
    });

    return res.json({ success: true, message: 'Test drive updated.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update test drive.', error: error.message });
  }
};

// DELETE /test-drives/:id (admin only)
export const deleteTestDrive = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const testDrive = await prisma.testDrive.findUnique({ where: { id } });
    if (!testDrive) return res.status(404).json({ success: false, message: 'Test drive not found.' });

    await prisma.testDrive.delete({ where: { id } });

    await prisma.activityLog.create({
      data: { action: 'DELETE_TEST_DRIVE', entityType: 'TestDrive', entityId: id, performedBy: user.id },
    });

    return res.json({ success: true, message: 'Test drive deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete test drive.', error: error.message });
  }
};
