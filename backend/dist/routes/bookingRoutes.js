"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Authenticated customer booking routes
router.post('/', auth_1.authenticateJWT, bookingController_1.createBooking);
router.get('/my', auth_1.authenticateJWT, bookingController_1.getMyBookings);
// Protected Admin CRM ledger routes
router.get('/ledger', auth_1.authenticateJWT, auth_1.requireAdmin, bookingController_1.getBookingLedger);
router.patch('/:id/status', auth_1.authenticateJWT, auth_1.requireAdmin, bookingController_1.updateBookingStatus);
exports.default = router;
//# sourceMappingURL=bookingRoutes.js.map