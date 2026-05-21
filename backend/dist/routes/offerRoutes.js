"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offerController_1 = require("../controllers/offerController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Wishlist Favorites endpoints
router.post('/favorites', auth_1.authenticateJWT, offerController_1.toggleFavorite);
router.get('/favorites/my', auth_1.authenticateJWT, offerController_1.getMyFavorites);
// Price Proposal Offers endpoints
router.post('/submit', auth_1.authenticateJWT, offerController_1.submitOffer);
router.get('/my', auth_1.authenticateJWT, offerController_1.getMyOffers);
// Protected Admin Offer Manager routes
router.get('/manager', auth_1.authenticateJWT, auth_1.requireAdmin, offerController_1.getOfferManager);
router.patch('/:id/status', auth_1.authenticateJWT, auth_1.requireAdmin, offerController_1.updateOfferStatus);
exports.default = router;
//# sourceMappingURL=offerRoutes.js.map