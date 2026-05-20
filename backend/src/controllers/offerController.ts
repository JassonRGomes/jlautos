import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Customer Submits Price Proposal Offer
export const submitOffer = async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId, offerAmount } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to submit proposals.' });
  }

  if (!vehicleId || !offerAmount) {
    return res.status(400).json({ message: 'Vehicle and Offer Amount are required fields.' });
  }

  try {
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Target vehicle not found in inventory.' });
    }

    const offer = await prisma.offer.create({
      data: {
        userId: req.user.id,
        vehicleId,
        offerAmount: parseFloat(String(offerAmount)),
        status: 'UNDER_REVIEW',
      },
    });

    return res.status(201).json({
      message: 'Luxury proposal submitted successfully and is currently under review.',
      offer,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error submitting proposal offer.', error: error.message });
  }
};

// 2. Fetch Customer Proposals for Dashboard Pipeline
export const getMyOffers = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to view your offers.' });
  }

  try {
    const offers = await prisma.offer.findMany({
      where: { userId: req.user.id },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = offers.map((o) => ({
      ...o,
      vehicle: {
        ...o.vehicle,
        images: JSON.parse(o.vehicle.images),
      },
    }));

    return res.status(200).json({ offers: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error loading user proposals pipeline.', error: error.message });
  }
};

// 3. Get All Offers (Administrative Review Panel)
export const getOfferManager = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = offers.map((o) => ({
      ...o,
      vehicle: {
        ...o.vehicle,
        images: JSON.parse(o.vehicle.images),
      },
    }));

    return res.status(200).json({ count: formatted.length, offers: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error loading administrative offer ledger.', error: error.message });
  }
};

// 4. Admin Accepts / Declines Proposal Offer
export const updateOfferStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // "ACCEPTED" or "DECLINED"

  if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
    return res.status(400).json({ message: 'A status value of ACCEPTED or DECLINED is required.' });
  }

  try {
    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Price proposal listing not found.' });
    }

    const updated = await prisma.offer.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        vehicle: true,
      },
    });

    // If offer is accepted, we could automatically tag the vehicle status as "RESERVED"
    if (status === 'ACCEPTED') {
      await prisma.vehicle.update({
        where: { id: existing.vehicleId },
        data: { status: 'RESERVED' },
      });
      console.log(`[Offer Accepted] Vehicle ${existing.vehicleId} automatically set to RESERVED status.`);
    }

    return res.status(200).json({
      message: `Luxury offer proposal was successfully marked as ${status}.`,
      offer: {
        ...updated,
        vehicle: {
          ...updated.vehicle,
          images: JSON.parse(updated.vehicle.images),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error processing luxury proposal update.', error: error.message });
  }
};

// 5. Toggle Favorites on Card Feeds
export const toggleFavorite = async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to manage favorites.' });
  }

  if (!vehicleId) {
    return res.status(400).json({ message: 'Vehicle ID is required.' });
  }

  try {
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId: req.user.id,
          vehicleId,
        },
      },
    });

    if (existing) {
      // Remove favorite
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return res.status(200).json({ isFavorite: false, message: 'Removed from favorites successfully.' });
    } else {
      // Add favorite
      await prisma.favorite.create({
        data: {
          userId: req.user.id,
          vehicleId,
        },
      });
      return res.status(200).json({ isFavorite: true, message: 'Added to favorites successfully.' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Error toggling wishlist favorite.', error: error.message });
  }
};

// 6. Get Favorites for dashboard
export const getMyFavorites = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: { vehicle: true },
    });

    const formatted = favorites.map((f) => ({
      ...f,
      vehicle: {
        ...f.vehicle,
        images: JSON.parse(f.vehicle.images),
      },
    }));

    return res.status(200).json({ favorites: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error loading favorites.', error: error.message });
  }
};
