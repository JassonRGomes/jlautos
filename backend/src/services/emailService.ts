import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.EMAIL_SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || '2525');
const SMTP_USER = process.env.EMAIL_SMTP_USER || '';
const SMTP_PASS = process.env.EMAIL_SMTP_PASS || '';
const AGENCY_EMAIL = process.env.AGENCY_EMAIL || 'admin@jlautos.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configurable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // Use true for SSL/TLS on port 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify connection configuration on startup
transporter.verify((error) => {
  if (error) {
    console.error('SMTP Connection Warning:', error.message);
  } else {
    console.log('SMTP Email Service is active and ready.');
  }
});

interface BookingMailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleDetails: {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    transmission: string;
    color: string;
  };
  bookingDate: Date;
  timeSlot: string;
  eventType: string; // "VISIT" | "TEST_DRIVE"
}

// 1. Dispatch Booking Alerts to the J&L Autos Agency
export const sendAgencyBookingAlert = async (data: BookingMailData) => {
  const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mailOptions = {
    from: `"J&L Autos Security" <noreply@jlautos.com>`,
    to: AGENCY_EMAIL,
    subject: `[NEW BOOKING ALERT] - New ${data.eventType.replace('_', ' ')} Scheduled`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0e; color: #e5e5e7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #121214; border: 1px solid #1f1f23; border-radius: 8px; overflow: hidden; }
          .header { background-color: #0c0c0e; padding: 30px; text-align: center; border-bottom: 1px solid #1f1f23; }
          .logo { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
          .logo span { color: #0066ff; }
          .content { padding: 40px 30px; }
          .alert-title { font-size: 20px; font-weight: 600; color: #ffffff; margin-bottom: 20px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
          .info-block { background-color: #0c0c0e; border: 1px solid #1f1f23; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1a1a1e; }
          .info-row:last-child { border-bottom: none; }
          .label { font-size: 13px; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 15px; color: #ffffff; font-weight: 500; text-align: right; }
          .btn-container { text-align: center; margin-top: 30px; }
          .btn { background-color: #0066ff; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
          .footer { background-color: #0c0c0e; padding: 20px; text-align: center; font-size: 12px; color: #48484a; border-top: 1px solid #1f1f23; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">J&L <span>AUTOS</span></h1>
          </div>
          <div class="content">
            <h2 class="alert-title">New Lead Assignment</h2>
            <p style="text-align: center; color: #a1a1a5; margin-bottom: 30px;">A user has scheduled a new visit/test drive on the online digital showroom portal.</p>
            
            <div class="info-block">
              <h3 style="color: #0066ff; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Customer Information</h3>
              <div class="info-row"><div class="label">Name:</div><div class="value">${data.customerName}</div></div>
              <div class="info-row"><div class="label">Email:</div><div class="value">${data.customerEmail}</div></div>
              <div class="info-row"><div class="label">Phone:</div><div class="value">${data.customerPhone || 'N/A'}</div></div>
            </div>

            <div class="info-block">
              <h3 style="color: #0066ff; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Booking Event Data</h3>
              <div class="info-row"><div class="label">Event Type:</div><div class="value" style="color: #34c759;">${data.eventType === 'TEST_DRIVE' ? 'TEST DRIVE' : 'VISIT SHOWROOM'}</div></div>
              <div class="info-row"><div class="label">Date:</div><div class="value">${formattedDate}</div></div>
              <div class="info-row"><div class="label">Time Slot:</div><div class="value">${data.timeSlot}</div></div>
            </div>

            <div class="info-block">
              <h3 style="color: #0066ff; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Selected Showroom Car</h3>
              <div class="info-row"><div class="label">Vehicle:</div><div class="value">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
              <div class="info-row"><div class="label">Price:</div><div class="value">$${data.vehicleDetails.price.toLocaleString('en-US')}</div></div>
              <div class="info-row"><div class="label">Specs:</div><div class="value">${data.vehicleDetails.transmission} | ${data.vehicleDetails.color}</div></div>
            </div>

            <div class="btn-container">
              <a href="${FRONTEND_URL}/admin/bookings" class="btn">View CRM Ledger</a>
            </div>
          </div>
          <div class="footer">
            &copy; 2026 J&L Autos. CRM Automated System Alert.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Trigger Service] Booking agency alert dispatched successfully via SMTP.');
    return info;
  } catch (err: any) {
    console.error('[SMTP Alert Trigger Failure]:', err.message);
    console.log('[Mock Email Dispatch] to:', AGENCY_EMAIL);
    console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
    return { mockSent: true, error: err.message };
  }
};

// 2. Dispatch High-End Invoice-Style Confirmation to the Customer
export const sendCustomerBookingConfirmation = async (data: BookingMailData) => {
  const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mailOptions = {
    from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
    to: data.customerEmail,
    subject: `Booking Confirmed - J&L Autos`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0e; color: #e5e5e7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #121214; border: 1px solid #1f1f23; border-radius: 8px; overflow: hidden; }
          .header { background-color: #0c0c0e; padding: 40px 30px; text-align: center; border-bottom: 1px solid #1f1f23; }
          .logo { color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0; }
          .logo span { color: #0066ff; }
          .subtitle { color: #8e8e93; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 22px; color: #ffffff; font-weight: 400; text-align: center; margin-bottom: 10px; }
          .status-banner { text-align: center; background: rgba(52, 199, 89, 0.1); border: 1px solid #34c759; padding: 12px; border-radius: 4px; color: #34c759; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 13px; margin: 25px 0; }
          .summary-card { background-color: #0c0c0e; border: 1px solid #1f1f23; border-radius: 6px; padding: 25px; margin-bottom: 30px; }
          .invoice-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1a1a1e; }
          .invoice-row:last-child { border-bottom: none; }
          .inv-label { color: #8e8e93; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .inv-val { color: #ffffff; font-size: 15px; font-weight: 500; text-align: right; }
          .dealership-block { background: linear-gradient(135deg, #121214 0%, #17171d 100%); border: 1px dashed #0066ff; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
          .btn-container { text-align: center; margin-top: 35px; }
          .btn { background-color: #0066ff; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; }
          .footer { background-color: #0c0c0e; padding: 30px; text-align: center; font-size: 12px; color: #48484a; border-top: 1px solid #1f1f23; }
          .footer-text { line-height: 1.6; margin-bottom: 15px; }
          .social-links { margin-top: 20px; }
          .social-links a { color: #8e8e93; text-decoration: none; margin: 0 10px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">J&L <span>AUTOS</span></h1>
            <p class="subtitle">Premium Digital Showroom</p>
          </div>
          <div class="content">
            <h2 class="greeting">Dear ${data.customerName},</h2>
            <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px; margin: 0 auto; max-width: 480px;">
              Thank you for scheduling a session with J&L Autos. We are thrilled to host you and present our selection of premium luxury motorcars.
            </p>
            
            <div class="status-banner">
              Booking Status: Confirmed & Reserved
            </div>

            <div class="summary-card">
              <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">Appointment Details</h3>
              <div class="invoice-row"><div class="inv-label">Event:</div><div class="inv-val" style="color: #0066ff; font-weight: 600;">${data.eventType === 'TEST_DRIVE' ? 'VIP TEST DRIVE' : 'SHOWROOM PRIVATE VISIT'}</div></div>
              <div class="invoice-row"><div class="inv-label">Date:</div><div class="inv-val">${formattedDate}</div></div>
              <div class="invoice-row"><div class="inv-label">Time Slot:</div><div class="inv-val">${data.timeSlot}</div></div>
              <div class="invoice-row"><div class="inv-label">Selected Motorcar:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
              <div class="invoice-row"><div class="inv-label">Dealership Valuation:</div><div class="inv-val" style="color: #ffffff; font-weight: bold;">$${data.vehicleDetails.price.toLocaleString('en-US')}</div></div>
            </div>

            <div class="dealership-block">
              <h4 style="margin: 0 0 10px 0; color: #0066ff; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Dealership Location</h4>
              <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 500; font-size: 14px;">J&L Autos Luxury Flagship Showroom</p>
              <p style="margin: 0 0 12px 0; color: #a1a1a5; font-size: 13px; line-height: 1.4;">100 Premium Way, Suite 400<br>Beverly Hills, CA 90210</p>
              <p style="margin: 0; color: #8e8e93; font-size: 12px;">Need directions or running late? Call us directly: <strong>+1 (214) 608-0670</strong></p>
            </div>

            <p style="font-size: 13px; color: #8e8e93; line-height: 1.5; text-align: center; font-style: italic;">
              Please ensure you bring a valid driver's license and proof of coverage (for test drive experiences). Our dedicated concierge team will be awaiting your arrival.
            </p>

            <div class="btn-container">
              <a href="${FRONTEND_URL}/dashboard/bookings" class="btn">Manage Appointment</a>
            </div>
          </div>
          <div class="footer">
            <p class="footer-text">
              This email is a transactional booking invoice for J&L Autos. Please do not reply directly to this mailer.
            </p>
            <div class="social-links">
              <a href="${FRONTEND_URL}">Showroom</a>
              <a href="https://wa.me/12146080670">WhatsApp Support</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Trigger Service] Customer booking confirmation dispatched successfully via SMTP.');
    return info;
  } catch (err: any) {
    console.error('[SMTP Alert Trigger Failure]:', err.message);
    console.log('[Mock Email Dispatch] to:', data.customerEmail);
    console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
    return { mockSent: true, error: err.message };
  }
};

// 3. Dispatch General Admin Newsletter Blast containing vehicle details
interface NewsletterMailData {
  vehicleDetails: {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    transmission: string;
    color: string;
    image: string;
    description: string;
  };
  recipients: string[];
}

export const blastVehicleNewsletter = async (data: NewsletterMailData) => {
  const mailOptions = {
    from: `"J&L Autos Portfolio" <curator@jlautos.com>`,
    bcc: data.recipients.join(','),
    subject: `[EXCLUSIVE PORTFOLIO ALERT] - The ${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model} Now Available`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0e; color: #e5e5e7; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #121214; border: 1px solid #1f1f23; border-radius: 8px; overflow: hidden; }
          .header { background-color: #0c0c0e; padding: 40px 30px; text-align: center; border-bottom: 1px solid #1f1f23; }
          .logo { color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0; }
          .logo span { color: #0066ff; }
          .subtitle { color: #8e8e93; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
          .content { padding: 40px 30px; }
          .car-image { width: 100%; border-radius: 6px; margin-bottom: 25px; border: 1px solid #1f1f23; max-height: 300px; object-fit: cover; }
          .car-title { font-size: 24px; color: #ffffff; font-weight: 600; margin: 0 0 10px 0; }
          .car-price { font-size: 22px; color: #0066ff; font-weight: bold; margin-bottom: 20px; }
          .car-description { color: #a1a1a5; font-size: 15px; line-height: 1.6; margin-bottom: 25px; }
          .specs-grid { background-color: #0c0c0e; border: 1px solid #1f1f23; padding: 15px; border-radius: 6px; margin-bottom: 30px; }
          .spec-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1e; }
          .spec-row:last-child { border-bottom: none; }
          .label { color: #8e8e93; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .val { color: #ffffff; font-size: 14px; font-weight: 500; }
          .btn-container { text-align: center; margin-top: 35px; }
          .btn { background-color: #0066ff; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; }
          .footer { background-color: #0c0c0e; padding: 30px; text-align: center; font-size: 11px; color: #48484a; border-top: 1px solid #1f1f23; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">J&L <span>AUTOS</span></h1>
            <p class="subtitle">Exclusive Showroom Portfolio</p>
          </div>
          <div class="content">
            <h2 class="car-title">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</h2>
            <div class="car-price">$${data.vehicleDetails.price.toLocaleString('en-US')}</div>
            
            ${data.vehicleDetails.image ? `<img src="${data.vehicleDetails.image}" class="car-image" alt="J&L Autos Portfolio Vehicle" />` : ''}

            <p class="car-description">${data.vehicleDetails.description}</p>

            <div class="specs-grid">
              <div class="spec-row"><div class="label">Transmission:</div><div class="val">${data.vehicleDetails.transmission}</div></div>
              <div class="spec-row"><div class="label">Color:</div><div class="val">${data.vehicleDetails.color}</div></div>
              <div class="spec-row"><div class="label">Year:</div><div class="val">${data.vehicleDetails.year}</div></div>
            </div>

            <div style="text-align: center;">
              <p style="font-size: 13px; color: #8e8e93; font-style: italic; margin-bottom: 20px;">This flagship model is now open for private test drive bookings.</p>
            </div>

            <div class="btn-container">
              <a href="${FRONTEND_URL}/vehicles/${data.vehicleDetails.id}" class="btn">Explore In Showroom</a>
            </div>
          </div>
          <div class="footer">
            &copy; 2026 J&L Autos Luxury Flagship Showroom. All rights reserved.<br>
            You are receiving this exclusive announcement because you registered with J&L Autos.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Trigger Service] Newsletter blast dispatched successfully via SMTP.');
    return info;
  } catch (err: any) {
    console.error('[SMTP Newsletter Blast Failure]:', err.message);
    console.log('[Mock Email Dispatch] bcc recipients:', data.recipients.join(', '));
    console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
    return { mockSent: true, error: err.message };
  }
};
