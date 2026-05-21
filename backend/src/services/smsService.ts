import twilio from 'twilio';

// ─── Environment Configuration ────────────────────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || '';
const TWILIO_PHONE       = process.env.TWILIO_PHONE_NUMBER || '';
const AGENCY_PHONE       = process.env.AGENCY_PHONE_NUMBER || '';
const SMS_ENABLED        = process.env.SMS_ENABLED !== 'false'; // default ON

// ─── Twilio Client (lazy-init only when credentials exist) ───────────────────
let twilioClient: twilio.Twilio | null = null;

const getClient = (): twilio.Twilio | null => {
  if (!SMS_ENABLED) return null;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[SMS Service] Twilio credentials not set — SMS is in MOCK mode.');
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

// ─── Phone Validation (E.164 format) ────────────────────────────────────────
const sanitizePhone = (phone: string): string | null => {
  if (!phone) return null;
  // Strip all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Must have at least 10 digits and optionally start with +
  if (cleaned.replace('+', '').length < 10) return null;
  return cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
};

// ─── In-Memory Deduplication Set (prevents duplicate sends in same session) ──
const sentSet = new Set<string>();

// ─── Retry Logic ─────────────────────────────────────────────────────────────
interface SMSJob {
  to: string;
  body: string;
  key: string;
  attempts: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sendWithRetry = async (job: SMSJob): Promise<boolean> => {
  const client = getClient();

  // Guard: check dedup key
  if (sentSet.has(job.key)) {
    console.log(`[SMS Service] Duplicate suppressed — key: ${job.key}`);
    return true;
  }

  // Guard: validate destination phone
  const toPhone = sanitizePhone(job.to);
  if (!toPhone) {
    console.error(`[SMS Service] Invalid phone number: "${job.to}" — SMS aborted.`);
    return false;
  }

  // MOCK MODE — no real Twilio client
  if (!client) {
    console.log('[SMS Service] ─── MOCK DISPATCH ─────────────────────────');
    console.log(`[SMS Service]   TO:   ${toPhone}`);
    console.log(`[SMS Service]   FROM: ${TWILIO_PHONE || 'MOCK_NUMBER'}`);
    console.log(`[SMS Service]   BODY:\n${job.body}`);
    console.log('[SMS Service] ───────────────────────────────────────────');
    sentSet.add(job.key);
    return true;
  }

  // REAL TWILIO SEND with retry
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const msg = await client.messages.create({
        to: toPhone,
        from: TWILIO_PHONE,
        body: job.body,
      });
      console.log(`[SMS Service] ✅ Sent | SID: ${msg.sid} | TO: ${toPhone} | Attempt: ${attempt}`);
      sentSet.add(job.key);
      return true;
    } catch (err: any) {
      console.error(`[SMS Service] ❌ Attempt ${attempt} failed | TO: ${toPhone} | Error: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  console.error(`[SMS Service] 🚫 All ${MAX_RETRIES} attempts exhausted for: ${toPhone}`);
  return false;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send SMS to the dealership when a new booking is created.
 */
export const sendNewBookingAlertToAgency = async (params: {
  bookingId: string;
  customerName: string;
  vehicle: string;
  date: string;
  timeSlot: string;
  eventType: string;
}): Promise<boolean> => {
  const { bookingId, customerName, vehicle, date, timeSlot, eventType } = params;

  const typeLabel = eventType === 'TEST_DRIVE' ? 'Test Drive' : 'Showroom Visit';
  const body = [
    `📋 NEW BOOKING REQUEST — J&L Autos`,
    ``,
    `Customer: ${customerName}`,
    `Vehicle: ${vehicle}`,
    `Date: ${date} at ${timeSlot}`,
    `Type: ${typeLabel}`,
    `ID: ${bookingId.slice(0, 8).toUpperCase()}`,
    ``,
    `Login to CRM to confirm or cancel.`,
  ].join('\n');

  const key = `agency-new-${bookingId}`;

  if (!AGENCY_PHONE) {
    console.warn('[SMS Service] AGENCY_PHONE_NUMBER not set — skipping agency SMS.');
    console.log('[SMS Service] Message that would be sent:\n', body);
    return false;
  }

  return sendWithRetry({ to: AGENCY_PHONE, body, key, attempts: 0 });
};

/**
 * Send SMS to the customer when their booking is CONFIRMED or CANCELLED.
 */
export const sendBookingStatusSMSToCustomer = async (params: {
  bookingId: string;
  customerPhone: string;
  status: 'CONFIRMED' | 'CANCELLED';
}): Promise<boolean> => {
  const { bookingId, customerPhone, status } = params;

  const body =
    status === 'CONFIRMED'
      ? [
          `✅ BOOKING CONFIRMED — J&L Autos`,
          ``,
          `Your appointment has been CONFIRMED.`,
          `J&L Autos thanks you for your appointment.`,
          ``,
          `Questions? Call us: +1 (214) 608-0670`,
          `Ref: ${bookingId.slice(0, 8).toUpperCase()}`,
        ].join('\n')
      : [
          `❌ BOOKING CANCELLED — J&L Autos`,
          ``,
          `Your booking has been CANCELLED.`,
          `Please contact J&L Autos for rescheduling.`,
          ``,
          `Call us: +1 (214) 608-0670`,
          `Ref: ${bookingId.slice(0, 8).toUpperCase()}`,
        ].join('\n');

  const key = `customer-status-${bookingId}-${status}`;
  return sendWithRetry({ to: customerPhone, body, key, attempts: 0 });
};

/**
 * Clear the deduplication set — useful for testing.
 */
export const clearSMSDedupeCache = (): void => {
  sentSet.clear();
  console.log('[SMS Service] Deduplication cache cleared.');
};

/**
 * Health check — returns whether Twilio is configured.
 */
export const getSMSServiceStatus = (): { enabled: boolean; configured: boolean; mockMode: boolean } => ({
  enabled: SMS_ENABLED,
  configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE),
  mockMode: !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN,
});
