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

// --- AUTO DEPLOY DO BANCO DE DADOS NO PRIMEIRO ACESSO ---
let isDbSynced = false;
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!isDbSynced) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Auto-fix URL encoding for passwords with special characters like '&'
      if (process.env.DATABASE_URL) {
        const regex = /:\/\/(.*?):(.*?)@/;
        const match = process.env.DATABASE_URL.match(regex);
        if (match && match[2].includes('&')) {
          process.env.DATABASE_URL = process.env.DATABASE_URL.replace(`:${match[2]}@`, `:${match[2].replace(/&/g, '%26')}@`);
        }
      }

      console.log("[JL Autos ERP] Primeiro acesso detectado: Sincronizando banco de dados via Raw SQL...");
      
      const initSqlPath = path.join(__dirname, '../prisma/init.sql');
      if (fs.existsSync(initSqlPath)) {
        const prisma = (await import('./config/db')).default;
        const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
        
        // Divide o script SQL em comandos individuais
        const statements = sqlContent.split(/;\s*$/m).filter((s: string) => s.trim().length > 0);
        
        let successCount = 0;
        for (const stmt of statements) {
          try {
            await prisma.$executeRawUnsafe(stmt);
            successCount++;
          } catch (err: any) {
            // Ignora erros de "Tabela já existe" ou "Chave duplicada"
            if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
              console.error("[JL Autos ERP] Erro ao executar query SQL específica:", err.message);
            }
          }
        }
        console.log(`[JL Autos ERP] Banco de dados sincronizado com sucesso via código! ${successCount} queries aplicadas.`);
      } else {
        console.error("[JL Autos ERP] Erro: Arquivo init.sql não encontrado em", initSqlPath);
      }
      isDbSynced = true; // Só executa uma vez
    } catch (error: any) {
      console.error("[JL Autos ERP] Erro crítico ao sincronizar banco no primeiro acesso:", error.message);
      isDbSynced = true; 
    }
  }
  next();
});
// --------------------------------------------------------

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
