import { Router } from 'express';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  updateBookingStatus,
  getMyBookings,
  getBookedSlots,
} from '../controllers/bookingController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

// Public route to fetch unavailable slots
router.get('/booked-slots/:vehicleId/:date', getBookedSlots);

// All other booking routes require authentication
router.use(authenticateJWT);

router.get('/my', getMyBookings);
router.get('/ledger', requireAdmin, getBookings);
router.get('/', getBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);
router.patch('/:id/status', requireAdmin, updateBookingStatus);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
