import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// GET /availability-slots
export const getAvailabilitySlots = async (req: Request, res: Response) => {
  const { dealershipId, date, isBooked } = req.query;

  const where: any = {};
  if (dealershipId) where.dealershipId = dealershipId;
  if (isBooked !== undefined) where.isBooked = isBooked === 'true';
  
  if (date) {
    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setHours(23, 59, 59, 999);
    where.date = { gte: startDate, lte: endDate };
  }

  try {
    const slots = await prisma.availabilitySlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return res.json({ success: true, data: slots });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch availability slots.', error: error.message });
  }
};

// GET /availability-slots/:id
export const getAvailabilitySlotById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
    if (!slot) return res.status(404).json({ success: false, message: 'Availability slot not found.' });
    return res.json({ success: true, data: slot });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch slot.', error: error.message });
  }
};

// POST /availability-slots (admin/manager only)
export const createAvailabilitySlot = async (req: AuthenticatedRequest, res: Response) => {
  const { dealershipId, date, startTime, endTime, type } = req.body;
  if (!dealershipId || !date || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'dealershipId, date, startTime, and endTime are required.' });
  }

  try {
    const slotDate = new Date(date);
    const slot = await prisma.availabilitySlot.create({
      data: { dealershipId, date: slotDate, startTime, endTime, type: type || 'TEST_DRIVE' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'CREATE_AVAILABILITY_SLOT',
        entityType: 'AvailabilitySlot',
        entityId: slot.id,
        performedBy: req.user!.id,
      },
    });

    return res.status(201).json({ success: true, message: 'Availability slot created.', data: slot });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create slot.', error: error.message });
  }
};

// PUT /availability-slots/:id (admin/manager only)
export const updateAvailabilitySlot = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isBooked, type, startTime, endTime, date } = req.body;

  try {
    const existing = await prisma.availabilitySlot.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Availability slot not found.' });

    const updates: any = {};
    if (isBooked !== undefined) updates.isBooked = isBooked;
    if (type) updates.type = type;
    if (startTime) updates.startTime = startTime;
    if (endTime) updates.endTime = endTime;
    if (date) updates.date = new Date(date);

    const updated = await prisma.availabilitySlot.update({
      where: { id },
      data: updates,
    });

    await prisma.activityLog.create({
      data: {
        action: 'UPDATE_AVAILABILITY_SLOT',
        entityType: 'AvailabilitySlot',
        entityId: id,
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Slot updated.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update slot.', error: error.message });
  }
};

// DELETE /availability-slots/:id (admin/manager only)
export const deleteAvailabilitySlot = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.availabilitySlot.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Availability slot not found.' });

    await prisma.availabilitySlot.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        action: 'DELETE_AVAILABILITY_SLOT',
        entityType: 'AvailabilitySlot',
        entityId: id,
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Slot deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete slot.', error: error.message });
  }
};
