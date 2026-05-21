"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadController_1 = require("../controllers/uploadController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/avatar', auth_1.authenticateJWT, uploadController_1.uploadAvatarHandler, uploadController_1.uploadAvatar);
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map