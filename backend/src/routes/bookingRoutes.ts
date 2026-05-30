import { Router } from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
} from '../controllers/bookingController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

// All booking routes require authentication
router.use(authenticateJWT);

router.get('/my', getBookings);
router.get('/ledger', requireAdmin, getBookings);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.patch('/:id/status', requireAdmin, updateBookingStatus);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
