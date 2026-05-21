"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public global settings
router.get('/', settingsController_1.getSettings);
// Protected Admin administrative routes
router.put('/', auth_1.authenticateJWT, auth_1.requireAdmin, settingsController_1.updateSettings);
router.get('/customers', auth_1.authenticateJWT, auth_1.requireAdmin, settingsController_1.getCustomerRegistry);
router.post('/newsletter', auth_1.authenticateJWT, auth_1.requireAdmin, settingsController_1.triggerNewsletterBlast);
router.get('/export', auth_1.authenticateJWT, auth_1.requireAdmin, settingsController_1.exportReport);
exports.default = router;
//# sourceMappingURL=settingsRoutes.js.map