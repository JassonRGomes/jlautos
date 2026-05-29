"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offerController_1 = require("../controllers/offerController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
router.post('/submit', offerController_1.submitOffer);
router.get('/my', offerController_1.getCustomerOffers);
router.get('/manager', auth_1.requireAdmin, offerController_1.getOffersManager);
router.patch('/:id/status', auth_1.requireAdmin, offerController_1.updateOfferStatus);
exports.default = router;
//# sourceMappingURL=offerRoutes.js.map