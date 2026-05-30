"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const vehicleRoutes_1 = __importDefault(require("./routes/vehicleRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const testDriveRoutes_1 = __importDefault(require("./routes/testDriveRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const dealershipRoutes_1 = __importDefault(require("./routes/dealershipRoutes"));
const availabilitySlotRoutes_1 = __importDefault(require("./routes/availabilitySlotRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const offerRoutes_1 = __importDefault(require("./routes/offerRoutes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        const allowed = [
            // Production frontend
            process.env.FRONTEND_URL || '',
            'https://lightcyan-shark-136321.hostingersite.com',
            // Local development — allow any localhost port
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
            // LAN / network development
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
        ];
        const isAllowed = allowed.some((rule) => {
            if (typeof rule === 'string')
                return rule && origin === rule;
            return rule.test(origin);
        });
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// Serve the static frontend built files with HTML extension handling
app.use(express_1.default.static(path_1.default.join(__dirname, '../public'), { extensions: ['html'] }));
// Health Check with database connectivity test
app.get('/health', async (_req, res) => {
    try {
        const { default: prisma } = await Promise.resolve().then(() => __importStar(require('./config/db')));
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'OK', database: 'Connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
    }
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/vehicles', vehicleRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/test-drives', testDriveRoutes_1.default);
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/uploads', uploadRoutes_1.default);
app.use('/api/dealerships', dealershipRoutes_1.default);
app.use('/api/availability-slots', availabilitySlotRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/offers', offerRoutes_1.default);
// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
});
// Fallback for non-API routes — auto-detect route folder and serve its index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    const publicDir = path_1.default.join(__dirname, '../public');
    // Extract the first path segment (e.g. 'details', 'dashboard', 'admin')
    // and try to serve its corresponding index.html
    const segments = req.path.split('/').filter(Boolean);
    if (segments.length > 0) {
        const routeDir = segments[0];
        const candidateHtml = path_1.default.join(publicDir, routeDir, 'index.html');
        return res.sendFile(candidateHtml, (err) => {
            if (err)
                res.sendFile(path_1.default.join(publicDir, 'index.html'));
        });
    }
    // Default: serve index.html
    res.sendFile(path_1.default.join(publicDir, 'index.html'));
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Global Error]:', err.stack || err);
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
const PORT = Number(process.env.PORT) || 5001;
// Only listen if run directly (not when imported by tests or server.js)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`[JL Autos ERP] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        // Test database connection on startup
        try {
            const { default: prisma } = await Promise.resolve().then(() => __importStar(require('./config/db')));
            await prisma.$queryRaw `SELECT 1`;
            console.log('[DB] ✅ Database connection established successfully.');
        }
        catch (err) {
            console.error('[DB] ❌ Database connection FAILED:', err.message);
            console.error('[DB] Check your DATABASE_URL in backend/.env');
        }
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map