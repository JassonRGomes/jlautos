import { Router } from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

// All booking routes require authentication
router.use(authenticateJWT);

router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', requireAdmin, deleteBooking);

export default router;
