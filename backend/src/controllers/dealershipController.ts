import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// GET /dealerships
export const getDealerships = async (req: Request, res: Response) => {
  try {
    const dealerships = await prisma.dealership.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: dealerships });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dealerships.', error: error.message });
  }
};

// GET /dealerships/:id
export const getDealershipById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const dealership = await prisma.dealership.findUnique({
      where: { id },
      include: {
        vehicles: { select: { id: true, make: true, model: true, year: true, price: true } },
      },
    });
    if (!dealership) return res.status(404).json({ success: false, message: 'Dealership not found.' });
    return res.json({ success: true, data: dealership });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dealership.', error: error.message });
  }
};

// POST /dealerships (admin only)
export const createDealership = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, address, city, state, zipCode, status } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

  try {
    const dealership = await prisma.dealership.create({
      data: { name, email, phone, address, city, state, zipCode, status: status || 'ACTIVE' },
    });

    await prisma.activityLog.create({
      data: {
        action: 'CREATE_DEALERSHIP',
        entityType: 'Dealership',
        entityId: dealership.id,
        performedBy: req.user!.id,
      },
    });

    return res.status(201).json({ success: true, message: 'Dealership created successfully.', data: dealership });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create dealership.', error: error.message });
  }
};

// PUT /dealerships/:id (admin only)
export const updateDealership = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, address, city, state, zipCode, status } = req.body;

  try {
    const existing = await prisma.dealership.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Dealership not found.' });

    const updated = await prisma.dealership.update({
      where: { id },
      data: { name, email, phone, address, city, state, zipCode, status },
    });

    await prisma.activityLog.create({
      data: {
        action: 'UPDATE_DEALERSHIP',
        entityType: 'Dealership',
        entityId: id,
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Dealership updated successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update dealership.', error: error.message });
  }
};

// DELETE /dealerships/:id (admin only)
export const deleteDealership = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.dealership.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Dealership not found.' });

    await prisma.dealership.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        action: 'DELETE_DEALERSHIP',
        entityType: 'Dealership',
        entityId: id,
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Dealership deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete dealership.', error: error.message });
  }
};
