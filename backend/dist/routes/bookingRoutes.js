"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testDriveBookingController_1 = require("../controllers/testDriveBookingController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public route to fetch unavailable slots
router.get('/booked-slots/:vehicleId/:date', bookingController_1.getBookedSlots);
// All other booking routes require authentication
router.use(auth_1.authenticateJWT);
router.get('/my', bookingController_1.getMyBookings);
router.get('/ledger', auth_1.requireAdmin, bookingController_1.getBookings);
router.get('/', bookingController_1.getBookings);
router.get('/:id', bookingController_1.getBookingById);
router.post('/', bookingController_1.createBooking);
router.patch('/:id/status', auth_1.requireAdmin, bookingController_1.updateBookingStatus);
router.put('/:id', bookingController_1.updateBooking);
router.delete('/:id', bookingController_1.deleteBooking);
exports.default = router;
//# sourceMappingURL=bookingRoutes.js.map