import { Router } from 'express';
import {
  submitOffer,
  getOffersManager,
  getCustomerOffers,
  updateOfferStatus,
} from '../controllers/offerController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/submit', submitOffer);
router.get('/my', getCustomerOffers);
router.get('/manager', requireAdmin, getOffersManager);
router.patch('/:id/status', requireAdmin, updateOfferStatus);

export default router;
