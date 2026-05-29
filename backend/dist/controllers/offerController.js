"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOfferStatus = exports.getCustomerOffers = exports.getOffersManager = exports.submitOffer = void 0;
const db_1 = __importDefault(require("../config/db"));
// POST /api/offers/submit - Stores a customer pricing proposal for a vehicle
const submitOffer = async (req, res) => {
    const user = req.user;
    const { vehicleId, offerAmount } = req.body;
    if (!vehicleId || !offerAmount) {
        return res.status(400).json({ success: false, message: 'vehicleId and offerAmount are required.' });
    }
    try {
        const vehicle = await db_1.default.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle)
            return res.status(404).json({ success: false, message: 'Vehicle not found.' });
        const offer = await db_1.default.offer.create({
            data: {
                userId: user.id,
                vehicleId,
                offerAmount,
                status: 'UNDER_REVIEW',
            },
            include: {
                vehicle: { select: { make: true, model: true, year: true, price: true } },
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: 'SUBMIT_OFFER',
                entityType: 'Offer',
                entityId: offer.id,
                performedBy: user.id,
            },
        });
        return res.status(201).json({ success: true, message: 'Offer submitted successfully.', data: offer });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to submit offer.', error: error.message });
    }
};
exports.submitOffer = submitOffer;
// GET /api/offers/manager - Loads pending and past proposals for administrative evaluation
const getOffersManager = async (req, res) => {
    try {
        const offers = await db_1.default.offer.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                vehicle: { select: { id: true, make: true, model: true, year: true, price: true } },
            },
        });
        return res.json({ success: true, data: offers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch offers.', error: error.message });
    }
};
exports.getOffersManager = getOffersManager;
// GET /api/offers/my - Loads proposals submitted by the logged-in customer
const getCustomerOffers = async (req, res) => {
    const user = req.user;
    try {
        const offers = await db_1.default.offer.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                vehicle: { select: { id: true, make: true, model: true, year: true, price: true, images: true } },
            },
        });
        return res.json({ success: true, data: offers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch your offers.', error: error.message });
    }
};
exports.getCustomerOffers = getCustomerOffers;
// PATCH /api/offers/:id/status - Resolves proposal status as ACCEPTED or DECLINED
const updateOfferStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Valid status is required (ACCEPTED or DECLINED).' });
    }
    try {
        const offer = await db_1.default.offer.findUnique({ where: { id } });
        if (!offer)
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        const updated = await db_1.default.offer.update({
            where: { id },
            data: { status },
            include: {
                user: { select: { name: true, email: true, phone: true } },
                vehicle: { select: { make: true, model: true } },
            },
        });
        await db_1.default.activityLog.create({
            data: {
                action: `UPDATE_OFFER_${status}`,
                entityType: 'Offer',
                entityId: id,
                performedBy: user.id,
            },
        });
        return res.json({ success: true, message: `Offer marked as ${status}.`, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update offer status.', error: error.message });
    }
};
exports.updateOfferStatus = updateOfferStatus;
//# sourceMappingURL=offerController.js.map