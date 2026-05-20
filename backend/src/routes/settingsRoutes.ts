import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getCustomerRegistry,
  triggerNewsletterBlast,
  exportReport,
} from '../controllers/settingsController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

const router = Router();

// Public global settings
router.get('/', getSettings);

// Protected Admin administrative routes
router.put('/', authenticateJWT, requireAdmin, updateSettings);
router.get('/customers', authenticateJWT, requireAdmin, getCustomerRegistry);
router.post('/newsletter', authenticateJWT, requireAdmin, triggerNewsletterBlast);
router.get('/export', authenticateJWT, requireAdmin, exportReport);

export default router;
