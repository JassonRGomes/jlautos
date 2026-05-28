import { Router, Request, Response } from 'express';
import prisma from '../config/db';

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

    return res.status(200).json({
      settings: {
        address: [dealership.address, dealership.city, dealership.state].filter(Boolean).join(', '),
        phone: dealership.phone || '',
        whatsappNumber: dealership.phone || '',
        operatingHours: {
          weekdays: 'Mon–Fri: 9:00 AM – 6:00 PM',
          saturday: 'Sat: 10:00 AM – 4:00 PM',
          sunday: 'Closed',
        },
        logoUrl: null,
        name: dealership.name,
        email: dealership.email,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to load dealership settings.', error: error.message });
  }
});

export default router;
