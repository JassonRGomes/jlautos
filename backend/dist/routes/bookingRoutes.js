"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All booking routes require authentication
router.use(auth_1.authenticateJWT);
router.get('/', bookingController_1.getBookings);
router.get('/:id', bookingController_1.getBookingById);
router.post('/', bookingController_1.createBooking);
router.put('/:id', bookingController_1.updateBooking);
router.delete('/:id', auth_1.requireAdmin, bookingController_1.deleteBooking);
exports.default = router;
//# sourceMappingURL=bookingRoutes.js.map