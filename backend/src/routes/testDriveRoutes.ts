import { Router } from 'express';
import {
  getTestDrives,
  getTestDriveById,
  createTestDrive,
  updateTestDrive,
  deleteTestDrive,
} from '../controllers/testDriveController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

// All test drive routes require authentication
router.use(authenticateJWT);

router.get('/', getTestDrives);
router.get('/:id', getTestDriveById);
router.post('/', createTestDrive);
router.put('/:id', updateTestDrive);
router.delete('/:id', requireAdmin, deleteTestDrive);

export default router;
