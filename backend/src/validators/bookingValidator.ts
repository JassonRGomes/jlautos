import { z } from 'zod';

// ─── Create Booking Validator ─────────────────────────────────────────────────
export const createBookingSchema = z.object({
  vehicleId: z.string().uuid({ message: 'Vehicle ID must be a valid UUID.' }),
  date: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid booking date format.' })
    .refine((d) => new Date(d) > new Date(), { message: 'Booking date must be in the future.' }),
  timeSlot: z
    .string()
    .min(1, 'Time slot is required.')
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i, { message: 'Time slot format must be like "10:00 AM" or "02:00 PM".' }),
  eventType: z.enum(['VISIT', 'TEST_DRIVE'], {
    message: 'Event type must be VISIT or TEST_DRIVE.',
  }),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional(),
});

// ─── Update Booking Status Validator ─────────────────────────────────────────
export const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'], {
    message: 'Status must be PENDING, CONFIRMED, CANCELED, or COMPLETED.',
  }),
  notes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
