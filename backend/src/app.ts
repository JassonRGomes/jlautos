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

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/test-drives', testDriveRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/dealership', dealershipRoutes);
app.use('/api/availability-slots', availabilitySlotRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
