import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

// Load Environment variables
dotenv.config();

// Imports Routing modules
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import offerRoutes from './routes/offerRoutes';
import settingsRoutes from './routes/settingsRoutes';
import uploadRoutes from './routes/uploadRoutes';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 1. Mount Security & Request parsing Middlewares
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true, // Enables HTTP-only cookies session tracking
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 2. Serve Static Compressed Uploaded Showroom Images
const uploadsDir = path.join(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve a baseline luxury welcome page at root URL
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    dealership: 'J&L Autos',
    specification: 'Luxury Digital Showroom CRM REST API Engine',
    version: '1.0.0',
    status: 'Operational',
    timestamp: new Date().toISOString(),
  });
});

// 3. Mount Modular API Routers
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// 4. Wildcard Unmatched Endpoint Handler (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Request endpoint not found in digital showroom route directories.' });
});

// 5. Global Error Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Server Error]:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected exception occurred inside the J&L Autos backend engine.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 6. Bind Server Port listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` J&L AUTOS RESTFUL API SERVER ACTIVE `);
  console.log(`   - Port Binding: http://localhost:${PORT}`);
  console.log(`   - Static Assets: http://localhost:${PORT}/uploads`);
  console.log(`   - Allowed Client Origin: ${FRONTEND_URL}`);
  console.log(`====================================================`);
});
