import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// POST /api/offers/submit - Stores a customer pricing proposal for a vehicle
export const submitOffer = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { vehicleId, offerAmount } = req.body;

  if (!vehicleId || !offerAmount) {
    return res.status(400).json({ success: false, message: 'vehicleId and offerAmount are required.' });
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found.' });

    const offer = await prisma.offer.create({
      data: {
        userId: user.id,
        vehicleId,
        offerAmount,
        status: 'UNDER_REVIEW',
      },
      include: {
        vehicle: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'SUBMIT_OFFER',
        entityType: 'Offer',
        entityId: offer.id,
        performedBy: user.id,
      },
    });

    return res.status(201).json({ success: true, message: 'Offer submitted successfully.', data: offer });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit offer.', error: error.message });
  }
};

// GET /api/offers/manager - Loads pending and past proposals for administrative evaluation
export const getOffersManager = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    return res.json({ success: true, data: offers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch offers.', error: error.message });
  }
};

// GET /api/offers/my - Loads proposals submitted by the logged-in customer
export const getCustomerOffers = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const offers = await prisma.offer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: true,
      },
    });

    return res.json({ success: true, data: offers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your offers.', error: error.message });
  }
};

// PATCH /api/offers/:id/status - Resolves proposal status as ACCEPTED or DECLINED
export const updateOfferStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user!;

  if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status is required (ACCEPTED or DECLINED).' });
  }

  try {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });

    const updated = await prisma.offer.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        vehicle: { select: { make: true, model: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: `UPDATE_OFFER_${status}`,
        entityType: 'Offer',
        entityId: id,
        performedBy: user.id,
      },
    });

    return res.json({ success: true, message: `Offer marked as ${status}.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update offer status.', error: error.message });
  }
};

// DELETE /offers/:id
export const deleteOffer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });

    if (user.role === 'CUSTOMER' && offer.userId !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await prisma.offer.delete({ where: { id } });

    await prisma.activityLog.create({
      data: { action: 'DELETE_OFFER', entityType: 'Offer', entityId: id, performedBy: user.id },
    });

    return res.json({ success: true, message: 'Offer deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete offer.', error: error.message });
  }
};
