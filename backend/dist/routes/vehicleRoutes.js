"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const vehicleController_1 = require("../controllers/vehicleController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Configure Multer memory storage for direct Sharp processing
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
    fileFilter: (req, file, cb) => {
        // Only accept image formats
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are accepted.'));
        }
    },
});
// Authenticated user saved searches and favorites (must declare before :id to prevent collision)
router.get('/favorites', auth_1.authenticateJWT, vehicleController_1.getFavorites);
router.post('/:id/favorite', auth_1.authenticateJWT, vehicleController_1.toggleFavorite);
router.get('/saved-searches', auth_1.authenticateJWT, vehicleController_1.getSavedSearches);
router.post('/saved-searches', auth_1.authenticateJWT, vehicleController_1.saveSearch);
router.delete('/saved-searches/:id', auth_1.authenticateJWT, vehicleController_1.deleteSavedSearch);
// Public Showroom routes
router.get('/', vehicleController_1.getVehicles);
router.get('/:id', vehicleController_1.getVehicleById);
// Protected Admin Inventory CMS routes
router.post('/', auth_1.authenticateJWT, auth_1.requireAdmin, vehicleController_1.createVehicle);
router.put('/:id', auth_1.authenticateJWT, auth_1.requireAdmin, vehicleController_1.updateVehicle);
router.delete('/:id', auth_1.authenticateJWT, auth_1.requireAdmin, vehicleController_1.deleteVehicle);
router.patch('/:id/status', auth_1.authenticateJWT, auth_1.requireAdmin, vehicleController_1.updateVehicleStatus);
router.post('/upload', auth_1.authenticateJWT, auth_1.requireAdmin, upload.array('images', 10), vehicleController_1.uploadImages);
exports.default = router;
//# sourceMappingURL=vehicleRoutes.js.map