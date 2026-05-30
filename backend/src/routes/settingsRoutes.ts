import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';
import { generatePDFReport } from '../utils/pdf';
import { generateExcelReport } from '../utils/excel';

const router = Router();

// GET /api/settings — Returns public dealership settings for the frontend
// Called by ThemeAuthContext on every page load
router.get('/', async (_req: Request, res: Response) => {
  try {
    const dealership = await prisma.dealership.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!dealership) {
      // Return sensible defaults if no dealership is configured yet
      return res.status(200).json({
        settings: {
          address: 'J&L Autos — Contact us for location',
          phone: '',
          whatsappNumber: '',
          operatingHours: {
            weekdays: 'Mon–Fri: 9:00 AM – 6:00 PM',
            saturday: 'Sat: 10:00 AM – 4:00 PM',
            sunday: 'Closed',
          },
          logoUrl: null,
        },
      });
    }

    let operatingHoursParsed = {
      weekdays: 'Mon–Fri: 9:00 AM – 6:00 PM',
      saturday: 'Sat: 10:00 AM – 4:00 PM',
      sunday: 'Closed',
    };

    if (dealership.operatingHours) {
      try {
        operatingHoursParsed = JSON.parse(dealership.operatingHours);
      } catch (e) {}
    }

    return res.status(200).json({
      settings: {
        address: dealership.address || [dealership.city, dealership.state].filter(Boolean).join(', ') || 'J&L Autos',
        phone: dealership.phone || '',
        whatsappNumber: dealership.whatsappNumber || dealership.phone || '',
        operatingHours: operatingHoursParsed,
        logoUrl: dealership.logoUrl || null,
        name: dealership.name,
        email: dealership.email,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to load dealership settings.', error: error.message });
  }
});

// GET /api/settings/customers — Loads registered customer profiles with their bookings/offers counts
router.get('/customers', authenticateJWT, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        _count: {
          select: { bookings: true, offers: true },
        },
      },
    });
    return res.status(200).json({ success: true, data: customers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to load customers.', error: error.message });
  }
});

// GET /api/settings/export — Produces inventory sheets
router.get('/export', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  const format = req.query.format as string;
  try {
    const vehicles = await prisma.vehicle.findMany();
    const headers = ['Make', 'Model', 'Year', 'Price', 'Status'];
    const rows = vehicles.map(v => [v.make, v.model, v.year.toString(), v.price.toString(), v.status]);
    const title = 'Inventory Report';

    if (format === 'excel') {
      await generateExcelReport(res, 'Inventory', headers, rows, 'inventory.xlsx');
    } else {
      await generatePDFReport(res, title, headers, rows, 'Inventory overview');
    }
  } catch (error: any) {
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Export failed.', error: error.message });
    }
  }
});

// POST /api/settings/newsletter — Blasts promotional emails to all active customers
router.post('/newsletter', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Placeholder logic for email dispatch
    return res.status(200).json({ success: true, message: 'Newsletter dispatched to active customers.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to send newsletter.', error: error.message });
  }
});

// PUT /api/settings/ — Updates active dealership settings
router.put('/', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  const { address, phone, whatsappNumber, logoUrl, operatingHours } = req.body;
  try {
    const dealership = await prisma.dealership.findFirst({ where: { status: 'ACTIVE' } });
    if (dealership) {
      const updated = await prisma.dealership.update({
        where: { id: dealership.id },
        data: {
          address,
          phone,
          whatsappNumber,
          logoUrl,
          operatingHours: operatingHours ? JSON.stringify(operatingHours) : null,
        },
      });
      return res.status(200).json({ success: true, data: updated });
    }
    return res.status(404).json({ success: false, message: 'Active dealership not found.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.', error: error.message });
  }
});

export default router;
