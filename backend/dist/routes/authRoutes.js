"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public auth endpoints
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Authenticated session profile
router.get('/profile', auth_1.authenticateJWT, authController_1.getProfile);
router.put('/profile', auth_1.authenticateJWT, authController_1.updateProfile);
// Terminate active JWT session
router.post('/logout', authController_1.logout);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map