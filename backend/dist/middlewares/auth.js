"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const JWT_SECRET = process.env.JWT_SECRET || 'jl_autos_premium_luxury_secret_key_2026';
// Verify JWT in cookies or Authorization header
const authenticateJWT = async (req, res, next) => {
    let token = req.cookies?.token;
    // Fallback to Authorization Header: Bearer <token>
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify user exists in the database
        const user = await db_1.default.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, name: true, phone: true }
        });
        if (!user) {
            return res.status(401).json({ message: 'User session invalid. Please log in again.' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(403).json({ message: 'Session expired or invalid token. Please log in again.' });
    }
};
exports.authenticateJWT = authenticateJWT;
// Enforce Admin Role
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role || '').toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=auth.js.map