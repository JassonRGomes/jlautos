"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testDriveController_1 = require("../controllers/testDriveController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All test drive routes require authentication
router.use(auth_1.authenticateJWT);
router.get('/', testDriveController_1.getTestDrives);
router.get('/:id', testDriveController_1.getTestDriveById);
router.post('/', testDriveController_1.createTestDrive);
router.put('/:id', testDriveController_1.updateTestDrive);
router.delete('/:id', auth_1.requireAdmin, testDriveController_1.deleteTestDrive);
exports.default = router;
//# sourceMappingURL=testDriveRoutes.js.map