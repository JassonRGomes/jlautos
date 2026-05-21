"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyFavorites = exports.toggleFavorite = exports.updateOfferStatus = exports.getOfferManager = exports.getMyOffers = exports.submitOffer = void 0;
const db_1 = __importDefault(require("../config/db"));
// 1. Customer Submits Price Proposal Offer
const submitOffer = async (req, res) => {
    const { vehicleId, offerAmount } = req.body;
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required to submit proposals.' });
    }
    if (!vehicleId || !offerAmount) {
        return res.status(400).json({ message: 'Vehicle and Offer Amount are required fields.' });
    }
    try {
        // Verify vehicle exists
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) {
            return res.status(404).json({ message: 'Target vehicle not found in inventory.' });
        }
        const offer = await db_1.default.offer.create({
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Error submitting proposal offer.', error: error.message });
    }
};
exports.submitOffer = submitOffer;
// 2. Fetch Customer Proposals for Dashboard Pipeline
const getMyOffers = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required to view your offers.' });
    }
    try {
        const offers = await db_1.default.offer.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Error loading user proposals pipeline.', error: error.message });
    }
};
exports.getMyOffers = getMyOffers;
// 3. Get All Offers (Administrative Review Panel)
const getOfferManager = async (req, res) => {
    try {
        const offers = await db_1.default.offer.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Error loading administrative offer ledger.', error: error.message });
    }
};
exports.getOfferManager = getOfferManager;
// 4. Admin Accepts / Declines Proposal Offer
const updateOfferStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // "ACCEPTED" or "DECLINED"
    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
        return res.status(400).json({ message: 'A status value of ACCEPTED or DECLINED is required.' });
    }
    try {
        const existing = await db_1.default.offer.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Price proposal listing not found.' });
        }
        const updated = await db_1.default.offer.update({
            where: { id },
            data: { status },
            include: {
                user: { select: { name: true, email: true } },
                vehicle: true,
            },
        });
        // If offer is accepted, we could automatically tag the vehicle status as "RESERVED"
        if (status === 'ACCEPTED') {
            await db_1.default.vehicle.update({
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Error processing luxury proposal update.', error: error.message });
    }
};
exports.updateOfferStatus = updateOfferStatus;
// 5. Toggle Favorites on Card Feeds
const toggleFavorite = async (req, res) => {
    const { vehicleId } = req.body;
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required to manage favorites.' });
    }
    if (!vehicleId) {
        return res.status(400).json({ message: 'Vehicle ID is required.' });
    }
    try {
        const existing = await db_1.default.favorite.findUnique({
            where: {
                userId_vehicleId: {
                    userId: req.user.id,
                    vehicleId,
                },
            },
        });
        if (existing) {
            // Remove favorite
            await db_1.default.favorite.delete({
                where: { id: existing.id },
            });
            return res.status(200).json({ isFavorite: false, message: 'Removed from favorites successfully.' });
        }
        else {
            // Add favorite
            await db_1.default.favorite.create({
                data: {
                    userId: req.user.id,
                    vehicleId,
                },
            });
            return res.status(200).json({ isFavorite: true, message: 'Added to favorites successfully.' });
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Error toggling wishlist favorite.', error: error.message });
    }
};
exports.toggleFavorite = toggleFavorite;
// 6. Get Favorites for dashboard
const getMyFavorites = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const favorites = await db_1.default.favorite.findMany({
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Error loading favorites.', error: error.message });
    }
};
exports.getMyFavorites = getMyFavorites;
//# sourceMappingURL=offerController.js.map