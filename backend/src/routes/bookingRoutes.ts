import { Router } from 'express';
import {
  createBooking,
  getMyBookings,
  updateBooking,
  deleteBooking,
} from '../controllers/testDriveBookingController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// All customer booking routes require JWT authentication
router.use(authenticateJWT);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
