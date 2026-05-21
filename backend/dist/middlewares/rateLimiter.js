"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// ─── General API Rate Limiter ─────────────────────────────────────────────────
// 150 requests per 15 minutes per IP
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many requests from this IP address. Please try again in 15 minutes.',
    },
    skip: (req) => req.method === 'OPTIONS',
});
// ─── Auth Endpoints Limiter ───────────────────────────────────────────────────
// Strict: 10 attempts per 15 minutes (prevents brute-force)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    },
});
// ─── Booking / Test Drive Creation Limiter ────────────────────────────────────
// 20 booking attempts per hour per IP
exports.bookingLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many booking requests. Please wait before submitting another appointment.',
    },
});
//# sourceMappingURL=rateLimiter.js.map