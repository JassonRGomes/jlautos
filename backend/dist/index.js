"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("./config/db"));
// Load Environment variables
dotenv_1.default.config();
// Imports Routing modules
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const vehicleRoutes_1 = __importDefault(require("./routes/vehicleRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const offerRoutes_1 = __importDefault(require("./routes/offerRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
// Initialize express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// 1. Mount Security & Request parsing Middlewares
app.use((0, cors_1.default)({
    origin: [
        FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
    ],
    credentials: true, // Enables HTTP-only cookies session tracking
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// 2. Serve Static Compressed Uploaded Showroom Images
const uploadsDir = path_1.default.join(__dirname, '../public/uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
// 2.5 Serve Static Frontend Files
const frontendPath = path_1.default.join(__dirname, '../public');
app.use(express_1.default.static(frontendPath, { extensions: ['html'] }));
// API Root check
app.get('/api', (req, res) => {
    res.status(200).json({
        dealership: 'J&L Autos',
        specification: 'Luxury Digital Showroom CRM REST API Engine',
        version: '1.0.0',
        status: 'Operational',
        timestamp: new Date().toISOString(),
    });
});
// 3. Mount Modular API Routers
app.use('/api/auth', authRoutes_1.default);
app.use('/api/vehicles', vehicleRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/offers', offerRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
// 4. Fallback for Next.js routing (Serve index.html for non-API routes if not found)
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ message: 'Request endpoint not found in digital showroom route directories.' });
    }
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// 5. Global Error Middleware
app.use((err, req, res, next) => {
    console.error('[Global Server Error]:', err.message);
    res.status(err.status || 500).json({
        message: err.message || 'An unexpected exception occurred inside the J&L Autos backend engine.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
});
// 6. Bind Server Port listener and assure Admin
const createDefaultAdminAndStartServer = async () => {
    try {
        const adminEmail = 'admin@jlautos.com';
        const existingAdmin = await db_1.default.user.findUnique({ where: { email: adminEmail } });
        if (!existingAdmin) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash('admin', salt);
            await db_1.default.user.create({
                data: {
                    email: adminEmail,
                    passwordHash,
                    name: 'System Administrator',
                    role: 'ADMIN',
                },
            });
            console.log('Default administrator account created (admin@jlautos.com)');
        }
    }
    catch (error) {
        console.error('Failed to ensure default admin account:', error);
    }
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(` J&L AUTOS RESTFUL API SERVER ACTIVE `);
        console.log(`   - Port Binding: http://localhost:${PORT}`);
        console.log(`   - Static Assets: http://localhost:${PORT}/uploads`);
        console.log(`   - Allowed Client Origin: ${FRONTEND_URL}`);
        console.log(`====================================================`);
    });
};
createDefaultAdminAndStartServer();
//# sourceMappingURL=index.js.map