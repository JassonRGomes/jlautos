"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testDriveBookingController_1 = require("../controllers/testDriveBookingController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All customer booking routes require JWT authentication
router.use(auth_1.authenticateJWT);
router.post('/', testDriveBookingController_1.createBooking);
router.get('/my', testDriveBookingController_1.getMyBookings);
router.put('/:id', testDriveBookingController_1.updateBooking);
router.put('/:id/accept', testDriveBookingController_1.acceptBooking);
router.delete('/:id', testDriveBookingController_1.deleteBooking);
exports.default = router;
//# sourceMappingURL=bookingRoutes.js.map