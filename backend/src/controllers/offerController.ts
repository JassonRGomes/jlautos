import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

// POST /api/offers/submit - Stores a customer pricing proposal for a vehicle
// RULE 2: Administrators cannot submit offers — conflict of interest prevention
export const submitOffer = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { vehicleId, offerAmount } = req.body;

  // Rule 2: Block admin from submitting offers on dealership vehicles
  if (user.role === 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Administrators are not permitted to submit price proposals on dealership assets.',
    });
  }

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

// GET /api/offers/manager - Loads ALL proposals for administrative evaluation (admin only)
export const getOffersManager = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!user.id) {
    return res.status(401).json({ success: false, message: 'User ID missing in token.' });
  }
  try {
    // Only admins can access this endpoint
    if ((user.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
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

// GET /api/offers/my - RULE 1: Customer only sees their own proposals
export const getCustomerOffers = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!user.id) {
    return res.status(401).json({ success: false, message: 'User ID missing in token.' });
  }
    // Admins should not use this endpoint; return empty array
    if ((user.role || '').toUpperCase() === 'ADMIN') {
      return res.json({ success: true, data: [] });
    }
    // Regular users see only their own offers
    const offers = await prisma.offer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        vehicle: true,
      },
    });

    return res.json({ success: true, data: offers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your offers.', error: error.message });
  }
};

// PATCH /api/offers/:id/status - Resolves proposal status as ACCEPTED or DECLINED (admin only)
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

// DELETE /api/offers/:id
// RULE 3: Admins can only delete offers that are already resolved (ACCEPTED or DECLINED)
//         Customers can only delete their own offers that are UNDER_REVIEW (retract proposal)
export const deleteOffer = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });

    if (user.role === 'ADMIN') {
      // Rule 3: Admin can only delete resolved offers (ACCEPTED or DECLINED)
      if (!['ACCEPTED', 'DECLINED'].includes(offer.status)) {
        return res.status(400).json({
          success: false,
          message: `Only resolved proposals (Accepted or Declined) can be deleted. This offer is currently "${offer.status}".`,
        });
      }
    } else {
      // Customer: can only manage their own offers
      if (offer.userId !== user.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only manage your own proposals.' });
      }
      // Customer can delete only UNDER_REVIEW offers
      if (offer.status !== 'UNDER_REVIEW') {
        return res.status(400).json({ success: false, message: `Only offers under review can be deleted. Current status is "${offer.status}".` });
      }
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
