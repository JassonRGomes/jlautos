import { Router } from 'express';
import multer from 'multer';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus,
  uploadImages,
  toggleFavorite,
  getFavorites,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
} from '../controllers/vehicleController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

const router = Router();

// Configure Multer memory storage for direct Sharp processing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
  fileFilter: (req, file, cb) => {
    // Only accept image formats
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted.'));
    }
  },
});

// Authenticated user saved searches and favorites (must declare before :id to prevent collision)
router.get('/favorites', authenticateJWT, getFavorites);
router.post('/:id/favorite', authenticateJWT, toggleFavorite);

router.get('/saved-searches', authenticateJWT, getSavedSearches);
router.post('/saved-searches', authenticateJWT, saveSearch);
router.delete('/saved-searches/:id', authenticateJWT, deleteSavedSearch);

// Public Showroom routes
router.get('/', getVehicles);
router.get('/:id', getVehicleById);

// Protected Admin Inventory CMS routes
router.post('/', authenticateJWT, requireAdmin, createVehicle);
router.put('/:id', authenticateJWT, requireAdmin, updateVehicle);
router.delete('/:id', authenticateJWT, requireAdmin, deleteVehicle);
router.patch('/:id/status', authenticateJWT, requireAdmin, updateVehicleStatus);
router.post('/upload', authenticateJWT, requireAdmin, upload.array('images', 10), uploadImages);

export default router;
