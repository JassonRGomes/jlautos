"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.uploadAvatarHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configuration for avatar upload
const publicUploadPath = path_1.default.join(__dirname, '../../public/uploads');
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (!fs_1.default.existsSync(publicUploadPath)) {
            fs_1.default.mkdirSync(publicUploadPath, { recursive: true });
        }
        cb(null, publicUploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `avatar_${uniqueSuffix}${ext}`);
    }
});
exports.uploadAvatarHandler = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed.'));
        }
    }
}).single('avatar');
const uploadAvatar = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No image file provided.' });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.status(200).json({ message: 'Avatar uploaded successfully.', url });
};
exports.uploadAvatar = uploadAvatar;
//# sourceMappingURL=uploadController.js.map