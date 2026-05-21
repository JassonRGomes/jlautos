import { Router } from 'express';
import {
  getAvailabilitySlots,
  getAvailabilitySlotById,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from '../controllers/availabilitySlotController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getAvailabilitySlots);
router.get('/:id', getAvailabilitySlotById);

// Protected routes
router.use(authenticateJWT);
router.post('/', requireAdmin, createAvailabilitySlot);
router.put('/:id', requireAdmin, updateAvailabilitySlot);
router.delete('/:id', requireAdmin, deleteAvailabilitySlot);

export default router;
