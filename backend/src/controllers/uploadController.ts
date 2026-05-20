import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuration for avatar upload
const publicUploadPath = path.join(__dirname, '../../public/uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(publicUploadPath)) {
      fs.mkdirSync(publicUploadPath, { recursive: true });
    }
    cb(null, publicUploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${uniqueSuffix}${ext}`);
  }
});

export const uploadAvatarHandler = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
}).single('avatar');

export const uploadAvatar = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.status(200).json({ message: 'Avatar uploaded successfully.', url });
};
