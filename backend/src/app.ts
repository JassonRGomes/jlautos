import express, { Request, Response, NextFunction } from 'express';
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

// Initialize core instances
const app = express();

// Security and Optimization Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- FOOLPROOF DATABASE DEPLOY ROUTE ---
app.get('/api/setup-database', async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    let dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return res.status(500).json({ error: "DATABASE_URL environment variable is not set." });
    }

    // Auto-fix URL encoding for passwords with special characters like '&'
    const regex = /:\/\/(.*?):(.*?)@/;
    const match = dbUrl.match(regex);
    if (match && match[2].includes('&')) {
      dbUrl = dbUrl.replace(`:${match[2]}@`, `:${match[2].replace(/&/g, '%26')}@`);
    }

    const initSqlPath = path.join(__dirname, '../prisma/init.sql');
    if (!fs.existsSync(initSqlPath)) {
      return res.status(500).json({ error: `init.sql not found at ${initSqlPath}` });
    }

    // Parse URL manually to bypass any Prisma issues
    const url = new URL(dbUrl);
    const mysql2 = require('mysql2/promise');
    
    const connection = await mysql2.createConnection({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      ssl: url.searchParams.get('sslcert') || url.searchParams.get('sslmode') ? { rejectUnauthorized: false } : undefined
    });

    const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
    const statements = sqlContent.split(/;\s*$/m).filter((s: string) => s.trim().length > 0);
    
    const results = {
      total: statements.length,
      success: 0,
      errors: [] as string[]
    };

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
        results.success++;
      } catch (err: any) {
        if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
          results.errors.push(err.message);
        }
      }
    }
    
    await connection.end();
    
    return res.status(200).json({
      message: "Database deployment routine finished.",
      details: results
    });

  } catch (error: any) {
    return res.status(500).json({
      error: "CRITICAL FAILURE during database setup",
      details: error.message,
      stack: error.stack
    });
  }
});
// --------------------------------------------------------

// Base Route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'JL Autos ERP API',
    version: '2.0.0',
    status: 'Operational',
  });
});

// Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const prisma = (await import('./config/db')).default;
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/test-drives', testDriveRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/dealerships', dealershipRoutes);
app.use('/api/availability-slots', availabilitySlotRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}` 
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

export default app;
