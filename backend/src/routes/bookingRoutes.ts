import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingLedger,
  updateBookingStatus,
} from '../controllers/bookingController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

const router = Router();

// Authenticated customer booking routes
router.post('/', authenticateJWT, createBooking);
router.get('/my', authenticateJWT, getMyBookings);

// Protected Admin CRM ledger routes
router.get('/ledger', authenticateJWT, requireAdmin, getBookingLedger);
router.patch('/:id/status', authenticateJWT, requireAdmin, updateBookingStatus);

export default router;
