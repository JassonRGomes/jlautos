import { Router } from 'express';
import { uploadAvatar, uploadAvatarHandler } from '../controllers/uploadController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/avatar', authenticateJWT, uploadAvatarHandler, uploadAvatar);

export default router;
