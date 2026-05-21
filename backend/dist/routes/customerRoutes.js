"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customerController_1 = require("../controllers/customerController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All customer management requires authentication + admin
router.use(auth_1.authenticateJWT, auth_1.requireAdmin);
router.get('/', customerController_1.getCustomers);
router.get('/:id', customerController_1.getCustomerById);
router.post('/', customerController_1.createCustomer);
router.put('/:id', customerController_1.updateCustomer);
router.delete('/:id', customerController_1.deleteCustomer);
exports.default = router;
//# sourceMappingURL=customerRoutes.js.map