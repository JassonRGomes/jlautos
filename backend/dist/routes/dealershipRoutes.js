"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealershipController_1 = require("../controllers/dealershipController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/', dealershipController_1.getDealerships);
router.get('/:id', dealershipController_1.getDealershipById);
// Protected routes
router.use(auth_1.authenticateJWT);
router.post('/', auth_1.requireAdmin, dealershipController_1.createDealership);
router.put('/:id', auth_1.requireAdmin, dealershipController_1.updateDealership);
router.delete('/:id', auth_1.requireAdmin, dealershipController_1.deleteDealership);
exports.default = router;
//# sourceMappingURL=dealershipRoutes.js.map