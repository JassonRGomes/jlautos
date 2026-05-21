import { z } from 'zod';

// ─── Create Test Drive Validator ──────────────────────────────────────────────
export const createTestDriveSchema = z.object({
  vehicleId: z.string().uuid({ message: 'Vehicle ID must be a valid UUID.' }),
  testDriveDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid test drive date.' })
    .refine((d) => new Date(d) > new Date(), { message: 'Test drive date must be in the future.' }),
  testDriveTime: z
    .string()
    .min(1, 'Time is required.')
    .regex(/^\d{1,2}:\d{2}\s?(AM|PM)$/i, { message: 'Time format must be like "10:00 AM".' }),
  location: z
    .string()
    .min(2, 'Location is required.')
    .max(200, 'Location is too long.')
    .optional()
    .default('Dealership'),
  salesRepId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional(),
});

// ─── Update Test Drive Status Validator ───────────────────────────────────────
export const updateTestDriveStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'APPROVED', 'COMPLETED', 'CANCELED', 'NO_SHOW'], {
    message: 'Status must be one of: SCHEDULED, APPROVED, COMPLETED, CANCELED, NO_SHOW.',
  }),
  adminNotes: z.string().max(500).optional(),
  salesRepId: z.string().uuid().optional().nullable(),
});

export type CreateTestDriveInput = z.infer<typeof createTestDriveSchema>;
export type UpdateTestDriveStatusInput = z.infer<typeof updateTestDriveStatusSchema>;
