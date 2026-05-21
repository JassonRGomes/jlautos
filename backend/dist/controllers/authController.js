"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const JWT_SECRET = process.env.JWT_SECRET || 'jl_autos_premium_luxury_secret_key_2026';
// HTTP-Only Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
};
// 1. Register User (CUSTOMER role by default)
const register = async (req, res) => {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required fields.' });
    }
    try {
        const existingUser = await db_1.default.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existingUser) {
            return res.status(409).json({ message: 'A profile with this email address already exists.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // First registered user becomes ADMIN
        const userCount = await db_1.default.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'CUSTOMER';
        const newUser = await db_1.default.user.create({
            data: {
                email: email.toLowerCase().trim(),
                passwordHash,
                name,
                phone,
                role,
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, cookieOptions);
        return res.status(201).json({
            message: 'Account registered successfully.',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                phone: newUser.phone,
                role: newUser.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error during registration.', error: error.message });
    }
};
exports.register = register;
// 2. Login User
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, cookieOptions);
        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                image: user.image,
                role: user.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Internal server error during login.', error: error.message });
    }
};
exports.login = login;
// 3. Get Current Authenticated Profile
const getProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthenticated.' });
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, phone: true, image: true, role: true, createdAt: true },
        });
        if (!user)
            return res.status(404).json({ message: 'User not found.' });
        return res.status(200).json({ user });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching profile.', error: error.message });
    }
};
exports.getProfile = getProfile;
// 4. Update Profile
const updateProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthenticated.' });
    }
    const { name, phone, image, currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const updates = {};
        if (name)
            updates.name = name;
        if (phone)
            updates.phone = phone;
        if (image !== undefined)
            updates.image = image;
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password required to set new password.' });
            }
            const user = await db_1.default.user.findUnique({ where: { id: userId } });
            if (!user)
                return res.status(404).json({ message: 'User not found.' });
            const match = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!match)
                return res.status(401).json({ message: 'Current password incorrect.' });
            const salt = await bcryptjs_1.default.genSalt(10);
            updates.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        }
        const updatedUser = await db_1.default.user.update({ where: { id: userId }, data: updates });
        return res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                image: updatedUser.image,
                role: updatedUser.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error updating profile.', error: error.message });
    }
};
exports.updateProfile = updateProfile;
// 5. Logout
const logout = async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return res.status(200).json({ message: 'Session logged out and cookies cleared successfully.' });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map