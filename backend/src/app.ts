import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

// Route imports
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import testDriveRoutes from './routes/testDriveRoutes';
import customerRoutes from './routes/customerRoutes';
import uploadRoutes from './routes/uploadRoutes';
import dealershipRoutes from './routes/dealershipRoutes';
import availabilitySlotRoutes from './routes/availabilitySlotRoutes';
import settingsRoutes from './routes/settingsRoutes';
import offerRoutes from './routes/offerRoutes';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

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
      if (typeof rule === 'string') return rule && origin === rule;
      return rule.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));


app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve the static frontend built files with HTML extension handling
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));

// Health Check with database connectivity test
app.get('/health', async (_req, res) => {
  try {
    const { default: prisma } = await import('./config/db');
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/test-drives', testDriveRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/dealerships', dealershipRoutes);
app.use('/api/availability-slots', availabilitySlotRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offers', offerRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Fallback for non-API routes to serve index.html (Next.js routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      const { default: prisma } = await import('./config/db');
      await prisma.$queryRaw`SELECT 1`;
      console.log('[DB] ✅ Database connection established successfully.');
    } catch (err: any) {
      console.error('[DB] ❌ Database connection FAILED:', err.message);
      console.error('[DB] Check your DATABASE_URL in backend/.env');
    }
  });
}

export default app;

