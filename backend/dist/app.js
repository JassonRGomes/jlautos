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
// Initialize core instances
const app = (0, express_1.default)();
// Security and Optimization Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Static file serving for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// Base Route
app.get('/', (req, res) => {
    res.json({
        name: 'JL Autos ERP API',
        version: '2.0.0',
        status: 'Operational',
    });
});
// Health Check
app.get('/health', async (req, res) => {
    try {
        const prisma = (await Promise.resolve().then(() => __importStar(require('./config/db')))).default;
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'OK', database: 'Connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
    }
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/vehicles', vehicleRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/test-drives', testDriveRoutes_1.default);
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/uploads', uploadRoutes_1.default);
app.use('/api/dealerships', dealershipRoutes_1.default);
app.use('/api/availability-slots', availabilitySlotRoutes_1.default);
// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Global Error]:', err.stack || err);
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// Start Server
const PORT = process.env.PORT || 5001;
// Only listen if this file is run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[JL Autos ERP] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map