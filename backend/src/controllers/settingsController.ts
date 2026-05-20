import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { blastVehicleNewsletter } from '../services/emailService';
import { generatePDFReport } from '../utils/pdf';
import { generateExcelReport } from '../utils/excel';

// 1. Fetch Global Corporate Settings (Address, Phone, Hours)
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });

    // Seed defaults if empty
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: {
          id: 'global',
          address: '100 Premium Way, Suite 400, Beverly Hills, CA 90210',
          phone: '+1 (214) 608-0670',
          whatsappNumber: '12146080670',
          logoUrl: null,
          operatingHours: JSON.stringify({
            weekdays: '9:00 AM - 6:00 PM',
            saturday: '10:00 AM - 5:00 PM',
            sunday: 'Closed',
          }),
        },
      });
    }

    const formatted = {
      ...settings,
      operatingHours: JSON.parse(settings.operatingHours),
    };

    return res.status(200).json({ settings: formatted });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving global metadata settings.', error: error.message });
  }
};

// 2. Edit Global Corporate Settings (CMS Admin Control)
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  const { address, phone, whatsappNumber, operatingHours, logoUrl } = req.body;

  try {
    const hoursStr = operatingHours
      ? typeof operatingHours === 'object'
        ? JSON.stringify(operatingHours)
        : String(operatingHours)
      : undefined;

    const updated = await prisma.globalSettings.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        address: address || '100 Premium Way, Beverly Hills, CA',
        phone: phone || '+1 (214) 608-0670',
        whatsappNumber: whatsappNumber || '12146080670',
        logoUrl: logoUrl || null,
        operatingHours: hoursStr || '{}',
      },
      update: {
        address,
        phone,
        whatsappNumber,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        ...(hoursStr && { operatingHours: hoursStr }),
      },
    });

    return res.status(200).json({
      message: 'Dealership global settings saved.',
      settings: {
        ...updated,
        operatingHours: JSON.parse(updated.operatingHours),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error saving settings.', error: error.message });
  }
};

// 3. Load Customers Directory (CRM Registry panel)
export const getCustomerRegistry = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            offers: true,
            favorites: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ count: customers.length, registry: customers });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error loading user directories.', error: error.message });
  }
};

// 4. Newsletter Hub Trigger: Blast Transactional Announcements
export const triggerNewsletterBlast = async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.body;

  if (!vehicleId) {
    return res.status(400).json({ message: 'A vehicle target is required for newsletter blasts.' });
  }

  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Target vehicle for blast was not found.' });
    }

    // Load registered customers emails
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { email: true },
    });

    if (customers.length === 0) {
      return res.status(200).json({ message: 'Newsletter blast target empty. No customers registered in system directory.' });
    }

    const emailList = customers.map((c) => c.email);
    const firstImage = JSON.parse(vehicle.images)[0] || '';

    // Trigger Nodemailer portfolio email dispatch
    await blastVehicleNewsletter({
      vehicleDetails: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        transmission: vehicle.transmission,
        color: vehicle.color,
        image: firstImage,
        description: vehicle.description,
      },
      recipients: emailList,
    });

    // Record the blast sent log
    const log = await prisma.newsletterBlast.create({
      data: {
        vehicleId,
        recipientCount: emailList.length,
      },
    });

    return res.status(200).json({
      message: `Newsletter portfolio blast sent successfully to ${emailList.length} registered customers.`,
      log,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error executing transactional newsletter blast.', error: error.message });
  }
};

// 5. Reports Engine: Generates Clean Printable PDF or Excel sheets
export const exportReport = async (req: AuthenticatedRequest, res: Response) => {
  const { format, type } = req.query; // format: "pdf" | "excel", type: "inventory" | "leads" | "sales"

  if (!format || !type) {
    return res.status(400).json({ message: 'Report format (pdf/excel) and type (inventory/leads/sales) are required.' });
  }

  try {
    if (type === 'inventory') {
      const vehicles = await prisma.vehicle.findMany({ orderBy: { make: 'asc' } });
      const valuation = vehicles.reduce((sum, v) => sum + v.price, 0);

      const headers = ['Make', 'Model', 'Year', 'Mileage', 'Valuation Price', 'Badge Status'];
      const rows = vehicles.map((v) => [
        v.make,
        v.model,
        String(v.year),
        `${v.mileage.toLocaleString()} mi`,
        `$${v.price.toLocaleString()}`,
        v.status,
      ]);

      const title = 'Inventory & Valuation Report';
      const summaryText = `Total Inventory Count: ${vehicles.length} listings. Total Dealership Assets Book Valuation: $${valuation.toLocaleString()}`;

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory_valuation_report.pdf"');
        generatePDFReport(res, title, headers, rows, summaryText);
      } else {
        await generateExcelReport(res, 'Showroom Inventory', headers, rows, 'inventory_valuation_report.xlsx');
      }

    } else if (type === 'leads') {
      const bookings = await prisma.booking.findMany({
        include: { user: true, vehicle: true },
        orderBy: { date: 'desc' },
      });

      const headers = ['Customer Name', 'Contact Info', 'Scheduled Date/Slot', 'Event Class', 'Motorcar Target', 'Booking Status'];
      const rows = bookings.map((b) => [
        b.user.name,
        `${b.user.email}${b.user.phone ? ` / ${b.user.phone}` : ''}`,
        `${new Date(b.date).toLocaleDateString()} at ${b.timeSlot}`,
        b.eventType === 'TEST_DRIVE' ? 'TEST DRIVE' : 'SHOWROOM VISIT',
        `${b.vehicle.year} ${b.vehicle.make} ${b.vehicle.model}`,
        b.status,
      ]);

      const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
      const title = 'Showroom Active Customer Leads';
      const summaryText = `Total Leads Registered: ${bookings.length} scheduling appointments. Pending Action Actions: ${pendingCount} slots under CRM review.`;

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="active_customer_leads.pdf"');
        generatePDFReport(res, title, headers, rows, summaryText);
      } else {
        await generateExcelReport(res, 'Active Customer Leads', headers, rows, 'active_customer_leads.xlsx');
      }

    } else if (type === 'sales') {
      const offers = await prisma.offer.findMany({
        where: { status: 'ACCEPTED' },
        include: { user: true, vehicle: true },
        orderBy: { updatedAt: 'desc' },
      });

      const totalRevenue = offers.reduce((sum, o) => sum + o.offerAmount, 0);

      const headers = ['Buyer Profile', 'Dealership Asset', 'Dealership Valuation', 'Accepted Offer Amount', 'Closing Date'];
      const rows = offers.map((o) => [
        o.user.name,
        `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}`,
        `$${o.vehicle.price.toLocaleString()}`,
        `$${o.offerAmount.toLocaleString()}`,
        new Date(o.updatedAt).toLocaleDateString(),
      ]);

      const title = 'Period Sales Performance Report';
      const summaryText = `Total Completed Acquisitions: ${offers.length} sold motorcars. Total Dealership Revenue Volume closed: $${totalRevenue.toLocaleString()}`;

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_performance_report.pdf"');
        generatePDFReport(res, title, headers, rows, summaryText);
      } else {
        await generateExcelReport(res, 'Sales Performance', headers, rows, 'sales_performance_report.xlsx');
      }

    } else {
      return res.status(400).json({ message: 'Invalid report type requested.' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Error generating printable reports.', error: error.message });
  }
};
