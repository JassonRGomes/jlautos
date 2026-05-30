import { Router } from 'express';
import {
  submitOffer,
  getOffersManager,
  getCustomerOffers,
  updateOfferStatus,
  deleteOffer,
} from '../controllers/offerController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/submit', submitOffer);
router.get('/my', getCustomerOffers);
router.get('/manager', requireAdmin, getOffersManager);
router.patch('/:id/status', requireAdmin, updateOfferStatus);
router.delete('/:id', deleteOffer);

export default router;
