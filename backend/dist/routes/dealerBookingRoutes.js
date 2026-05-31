"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testDriveBookingController_1 = require("../controllers/testDriveBookingController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Middleware to restrict access to dealership staff roles only
const requireDealer = (req, res, next) => {
    if (!req.user || !['ADMIN', 'MANAGER', 'SALES'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Dealership staff privileges required.'
        });
    }
    next();
};
router.use(auth_1.authenticateJWT);
router.use(requireDealer);
router.get('/', testDriveBookingController_1.getDealerBookings);
router.put('/:id/approve', testDriveBookingController_1.approveBooking);
router.put('/:id/reject', testDriveBookingController_1.rejectBooking);
router.put('/:id/cancel', testDriveBookingController_1.cancelBookingDealer);
router.put('/:id/modify', testDriveBookingController_1.modifyBooking);
router.put('/:id/complete', testDriveBookingController_1.completeBooking);
router.delete('/:id', testDriveBookingController_1.deleteBookingDealer);
exports.default = router;
//# sourceMappingURL=dealerBookingRoutes.js.map