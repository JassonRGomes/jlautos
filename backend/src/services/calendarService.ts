import { format } from 'path';

interface CalendarParams {
  bookingId: string;
  vehicleName: string;
  dealershipName: string;
  customerName: string;
  date: Date | string;
  time: string;
  address: string;
  contactPhone: string;
}

/**
 * Normalizes time string (e.g. "09:00 AM", "01:30 PM", "14:00") into hours and minutes.
 */
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  
  if (!match) {
    // Fallback if formatting doesn't match
    const parts = clean.split(':');
    return {
      hours: parseInt(parts[0], 10) || 9,
      minutes: parseInt(parts[1], 10) || 0,
    };
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (ampm.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes };
};

/**
 * Calculates start and end Date objects for a test drive (default duration: 45 minutes).
 */
const getEventDates = (dateInput: Date | string, timeStr: string): { start: Date; end: Date } => {
  const start = new Date(dateInput);
  const { hours, minutes } = parseTime(timeStr);
  
  // Set time in local timezone of the execution
  start.setHours(hours, minutes, 0, 0);
  
  // 45 minute test drive slot
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  
  return { start, end };
};

/**
 * Formats a Date object to YYYYMMDDTHHmmSSZ (UTC format for calendars).
 */
const formatToUtcString = (d: Date): string => {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates a Google Calendar "Add Event" URL template.
 */
export const generateGoogleCalendarLink = (params: CalendarParams): string => {
  const { start, end } = getEventDates(params.date, params.time);
  const dates = `${formatToUtcString(start)}/${formatToUtcString(end)}`;
  
  const title = `Test Drive: ${params.vehicleName} - J&L Autos`;
  const details = [
    `Vehicle: ${params.vehicleName}`,
    `Dealership: ${params.dealershipName}`,
    `Customer: ${params.customerName}`,
    `Contact Phone: ${params.contactPhone}`,
    `Ref ID: ${params.bookingId}`,
  ].join('\n');

  const location = params.address || 'J&L Autos Luxury Flagship Showroom';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
};

/**
 * Generates raw string content of an ICS (iCalendar) file.
 */
export const generateICSContent = (params: CalendarParams): string => {
  const { start, end } = getEventDates(params.date, params.time);
  const now = new Date();
  
  const title = `Test Drive: ${params.vehicleName} - J&L Autos`;
  const description = [
    `Vehicle: ${params.vehicleName}`,
    `Dealership: ${params.dealershipName}`,
    `Customer: ${params.customerName}`,
    `Contact Phone: ${params.contactPhone}`,
    `Ref ID: ${params.bookingId}`,
  ].join('\\n'); // double backslash for ICS line endings

  const location = params.address || 'J&L Autos Flagship Showroom';

  // Normalize string for ICS format (no commas in UID, simple string headers)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${params.bookingId}@jlautos.com`,
    `DTSTAMP:${formatToUtcString(now)}`,
    `DTSTART:${formatToUtcString(start)}`,
    `DTEND:${formatToUtcString(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};
