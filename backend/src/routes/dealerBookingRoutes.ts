import { Router, Response, NextFunction } from 'express';
import {
  getDealerBookings,
  approveBooking,
  rejectBooking,
  cancelBookingDealer,
  modifyBooking,
  completeBooking,
  deleteBookingDealer,
} from '../controllers/testDriveBookingController';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// Middleware to restrict access to dealership staff roles only
const requireDealer = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['ADMIN', 'MANAGER', 'SALES'].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Dealership staff privileges required.' 
    });
  }
  next();
};

router.use(authenticateJWT);
router.use(requireDealer);

router.get('/', getDealerBookings);
router.put('/:id/approve', approveBooking);
router.put('/:id/reject', rejectBooking);
router.put('/:id/cancel', cancelBookingDealer);
router.put('/:id/modify', modifyBooking);
router.put('/:id/complete', completeBooking);
router.delete('/:id', deleteBookingDealer);

export default router;
