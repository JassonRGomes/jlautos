import { Router } from 'express';
import {
  submitOffer,
  getMyOffers,
  getOfferManager,
  updateOfferStatus,
  toggleFavorite,
  getMyFavorites,
} from '../controllers/offerController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';

const router = Router();

// Wishlist Favorites endpoints
router.post('/favorites', authenticateJWT, toggleFavorite);
router.get('/favorites/my', authenticateJWT, getMyFavorites);

// Price Proposal Offers endpoints
router.post('/submit', authenticateJWT, submitOffer);
router.get('/my', authenticateJWT, getMyOffers);

// Protected Admin Offer Manager routes
router.get('/manager', authenticateJWT, requireAdmin, getOfferManager);
router.patch('/:id/status', authenticateJWT, requireAdmin, updateOfferStatus);

export default router;
