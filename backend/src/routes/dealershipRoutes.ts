import { Router } from 'express';
import {
  getDealerships,
  getDealershipById,
  createDealership,
  updateDealership,
  deleteDealership,
} from '../controllers/dealershipController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getDealerships);
router.get('/:id', getDealershipById);

// Protected routes
router.use(authenticateJWT);
router.post('/', requireAdmin, createDealership);
router.put('/:id', requireAdmin, updateDealership);
router.delete('/:id', requireAdmin, deleteDealership);

export default router;
