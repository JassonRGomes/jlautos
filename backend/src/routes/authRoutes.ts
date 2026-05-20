import { Router } from 'express';
import { register, login, getProfile, logout } from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Authenticated session profile
router.get('/profile', authenticateJWT, getProfile);

// Terminate active JWT session
router.post('/logout', logout);

export default router;
