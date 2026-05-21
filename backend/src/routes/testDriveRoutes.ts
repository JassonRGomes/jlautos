import { Router } from 'express';
import {
  createTestDrive,
  getMyTestDrives,
  getTestDriveLedger,
  getTestDriveById,
  updateTestDriveStatus,
  deleteTestDrive,
} from '../controllers/testDriveController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';
import { bookingLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Authenticated Customer Routes ─────────────────────────────────────────────
router.post('/', authenticateJWT, bookingLimiter, createTestDrive);
router.get('/my', authenticateJWT, getMyTestDrives);

// ── Admin CRM Routes ──────────────────────────────────────────────────────────
router.get('/ledger', authenticateJWT, requireAdmin, getTestDriveLedger);
router.get('/:id', authenticateJWT, requireAdmin, getTestDriveById);
router.patch('/:id/status', authenticateJWT, requireAdmin, updateTestDriveStatus);
router.delete('/:id', authenticateJWT, requireAdmin, deleteTestDrive);

export default router;
