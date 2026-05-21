import { Router } from 'express';
import { register, login, getProfile, logout, updateProfile } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Authenticated session profile
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);

// Terminate active JWT session
router.post('/logout', logout);

export default router;
