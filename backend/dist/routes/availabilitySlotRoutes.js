"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availabilitySlotController_1 = require("../controllers/availabilitySlotController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', availabilitySlotController_1.getAvailabilitySlots);
router.get('/:id', availabilitySlotController_1.getAvailabilitySlotById);
// Protected routes
router.use(auth_1.authenticateJWT);
router.post('/', auth_1.requireAdmin, availabilitySlotController_1.createAvailabilitySlot);
router.put('/:id', auth_1.requireAdmin, availabilitySlotController_1.updateAvailabilitySlot);
router.delete('/:id', auth_1.requireAdmin, availabilitySlotController_1.deleteAvailabilitySlot);
exports.default = router;
//# sourceMappingURL=availabilitySlotRoutes.js.map