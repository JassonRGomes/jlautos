import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { testDriveRepository } from '../repositories/testDriveRepository';
import { createTestDriveSchema, updateTestDriveStatusSchema } from '../validators/testDriveValidator';
import { sendNewBookingAlertToAgency, sendBookingStatusSMSToCustomer } from '../services/smsService';
import { sendAgencyBookingAlert, sendCustomerBookingConfirmation } from '../services/emailService';
import prisma from '../config/db';
import logger from '../utils/logger';

// ─── Helper: parse vehicle images safely ─────────────────────────────────────
const parseImages = (images: string): string[] => {
  try { return JSON.parse(images); } catch { return []; }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Customer Schedules a Test Drive
// ─────────────────────────────────────────────────────────────────────────────
export const createTestDrive = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required to schedule a test drive.' });
  }

  // Zod validation
  const parsed = createTestDriveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { vehicleId, testDriveDate, testDriveTime, location, salesRepId, notes } = parsed.data;

  try {
    // Verify vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: 'Selected vehicle was not found.' });
    }
    if (vehicle.status === 'SOLD') {
      return res.status(409).json({ message: 'This vehicle has already been sold and is unavailable for test drives.' });
    }

    // Check for scheduling conflict
    const conflict = await testDriveRepository.findConflict(
      vehicleId,
      new Date(testDriveDate),
      testDriveTime
    );
    if (conflict) {
      return res.status(409).json({
        message: 'This vehicle already has a test drive scheduled at the selected date and time.',
      });
    }

    // Create test drive record
    const testDrive = await testDriveRepository.create({
      userId: req.user.id,
      vehicleId,
      salesRepId: salesRepId ?? null,
      testDriveDate: new Date(testDriveDate),
      testDriveTime,
      location: location ?? 'Dealership',
      notes,
    });

    // Fetch full user for notifications
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, email: true, phone: true },
    });

    const customerName  = fullUser?.name  || req.user.name;
    const customerEmail = fullUser?.email || req.user.email;
    const vehicleLabel  = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    const formattedDate = new Date(testDriveDate).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });

    // ── Email notifications (fire-and-forget) ─────────────────────────────────
    Promise.all([
      sendAgencyBookingAlert({
        customerName,
        customerEmail,
        customerPhone: fullUser?.phone ?? undefined,
        vehicleDetails: {
          id: vehicle.id, make: vehicle.make, model: vehicle.model,
          year: vehicle.year, price: vehicle.price,
          transmission: vehicle.transmission, color: vehicle.color,
        },
        bookingDate: new Date(testDriveDate),
        timeSlot: testDriveTime,
        eventType: 'TEST_DRIVE',
      }),
      sendCustomerBookingConfirmation({
        customerName,
        customerEmail,
        customerPhone: fullUser?.phone ?? undefined,
        vehicleDetails: {
          id: vehicle.id, make: vehicle.make, model: vehicle.model,
          year: vehicle.year, price: vehicle.price,
          transmission: vehicle.transmission, color: vehicle.color,
        },
        bookingDate: new Date(testDriveDate),
        timeSlot: testDriveTime,
        eventType: 'TEST_DRIVE',
      }),
    ]).catch((e) => logger.error('[TestDrive] Email dispatch failed', { error: e.message }));

    // ── SMS to agency (fire-and-forget) ───────────────────────────────────────
    sendNewBookingAlertToAgency({
      bookingId: testDrive.id,
      customerName,
      vehicle: vehicleLabel,
      date: formattedDate,
      timeSlot: testDriveTime,
      eventType: 'TEST_DRIVE',
    })
      .then((ok) => logger.info(`[SMS] Agency test drive alert: ${ok ? 'dispatched' : 'not delivered'}`))
      .catch((e) => logger.error('[SMS] Agency alert error', { error: e.message }));

    // ── Activity Log ──────────────────────────────────────────────────────────
    prisma.activityLog.create({
      data: {
        action: 'TEST_DRIVE_SCHEDULED',
        entityType: 'TestDrive',
        entityId: testDrive.id,
        performedBy: req.user.id,
        metadata: JSON.stringify({ vehicle: vehicleLabel, date: formattedDate, time: testDriveTime }),
      },
    }).catch((e) => logger.error('[ActivityLog] Failed to write log', { error: e.message }));

    logger.info(`[TestDrive] New test drive scheduled by ${customerName} for ${vehicleLabel}`);

    return res.status(201).json({
      message: 'Test drive scheduled successfully. Confirmation notifications dispatched.',
      testDrive: {
        ...testDrive,
        vehicle: { ...testDrive.vehicle, images: parseImages(testDrive.vehicle.images) },
      },
      smsDispatched: true,
    });
  } catch (error: any) {
    logger.error('[TestDrive] Create error', { error: error.message });
    return res.status(500).json({ message: 'Failed to schedule test drive.', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Customer: Get My Test Drives
// ─────────────────────────────────────────────────────────────────────────────
export const getMyTestDrives = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  try {
    const testDrives = await testDriveRepository.findManyByUser(req.user.id);
    const formatted = testDrives.map((td) => ({
      ...td,
      vehicle: { ...td.vehicle, images: parseImages(td.vehicle.images) },
    }));
    return res.status(200).json({ count: formatted.length, testDrives: formatted });
  } catch (error: any) {
    logger.error('[TestDrive] getMyTestDrives error', { error: error.message });
    return res.status(500).json({ message: 'Failed to retrieve your test drives.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Admin: Get All Test Drives (CRM Ledger)
// ─────────────────────────────────────────────────────────────────────────────
export const getTestDriveLedger = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const testDrives = await testDriveRepository.findAll();
    const formatted = testDrives.map((td) => ({
      ...td,
      vehicle: { ...td.vehicle, images: parseImages(td.vehicle.images) },
    }));
    return res.status(200).json({ count: formatted.length, testDrives: formatted, ledger: formatted });
  } catch (error: any) {
    logger.error('[TestDrive] getTestDriveLedger error', { error: error.message });
    return res.status(500).json({ message: 'Failed to retrieve test drive ledger.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Admin: Get Single Test Drive by ID
// ─────────────────────────────────────────────────────────────────────────────
export const getTestDriveById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const td = await testDriveRepository.findById(id);
    if (!td) return res.status(404).json({ message: 'Test drive not found.' });
    return res.status(200).json({
      testDrive: { ...td, vehicle: { ...td.vehicle, images: parseImages(td.vehicle.images) } },
    });
  } catch (error: any) {
    logger.error('[TestDrive] getById error', { error: error.message });
    return res.status(500).json({ message: 'Failed to retrieve test drive.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Admin: Update Test Drive Status (+ SMS customer)
// ─────────────────────────────────────────────────────────────────────────────
export const updateTestDriveStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const parsed = updateTestDriveStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { status, adminNotes, salesRepId } = parsed.data;

  try {
    const existing = await testDriveRepository.findById(id);
    if (!existing) return res.status(404).json({ message: 'Test drive not found.' });

    if (existing.status === status) {
      return res.status(409).json({ message: `Test drive is already in ${status} state.` });
    }

    const updated = await testDriveRepository.updateStatus(id, {
      status,
      adminNotes,
      salesRepId: salesRepId ?? undefined,
    });

    let smsSent = false;
    let smsLog  = 'SMS not triggered.';

    // ── SMS to customer on APPROVED or CANCELED ───────────────────────────────
    if (status === 'APPROVED' || status === 'CANCELED') {
      const customerPhone = updated.user?.phone ?? null;
      if (customerPhone) {
        const smsMapped = status === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED';
        try {
          smsSent = await sendBookingStatusSMSToCustomer({
            bookingId: id,
            customerPhone,
            status: smsMapped,
          });
          smsLog = smsSent
            ? `SMS dispatched to customer: ${customerPhone}`
            : `SMS delivery failed for: ${customerPhone}`;
        } catch (smsErr: any) {
          smsLog = `SMS error: ${smsErr.message}`;
          logger.error('[SMS] Test drive status SMS failed', { error: smsErr.message });
        }
      } else {
        smsLog = 'Customer has no phone number — SMS skipped.';
      }
    }

    // ── Activity Log ──────────────────────────────────────────────────────────
    if (req.user) {
      prisma.activityLog.create({
        data: {
          action: `TEST_DRIVE_${status}`,
          entityType: 'TestDrive',
          entityId: id,
          performedBy: req.user.id,
          metadata: JSON.stringify({ previousStatus: existing.status, newStatus: status, smsSent }),
        },
      }).catch((e) => logger.error('[ActivityLog] Failed', { error: e.message }));
    }

    logger.info(`[TestDrive] Status updated: ${id} → ${status} | SMS: ${smsSent}`);

    return res.status(200).json({
      message: `Test drive updated to ${status} successfully.`,
      smsSent,
      smsLog,
      testDrive: {
        ...updated,
        vehicle: { ...updated.vehicle, images: parseImages(updated.vehicle.images) },
      },
    });
  } catch (error: any) {
    logger.error('[TestDrive] updateStatus error', { error: error.message });
    return res.status(500).json({ message: 'Failed to update test drive status.', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Admin: Delete Test Drive
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTestDrive = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await testDriveRepository.findById(id);
    if (!existing) return res.status(404).json({ message: 'Test drive not found.' });

    await testDriveRepository.delete(id);
    logger.info(`[TestDrive] Deleted: ${id}`);
    return res.status(200).json({ message: 'Test drive removed from system.' });
  } catch (error: any) {
    logger.error('[TestDrive] delete error', { error: error.message });
    return res.status(500).json({ message: 'Failed to delete test drive.', error: error.message });
  }
};
