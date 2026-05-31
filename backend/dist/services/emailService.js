"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestDriveRejectedEmail = exports.sendTestDriveCancelledEmail = exports.sendTestDriveModifiedEmail = exports.sendTestDriveApprovedEmail = exports.sendTestDriveCreatedEmail = exports.blastVehicleNewsletter = exports.sendCustomerBookingConfirmation = exports.sendAgencyBookingAlert = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const SMTP_HOST = process.env.EMAIL_SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || '2525');
const SMTP_USER = process.env.EMAIL_SMTP_USER || '';
const SMTP_PASS = process.env.EMAIL_SMTP_PASS || '';
const AGENCY_EMAIL = process.env.AGENCY_EMAIL || 'admin@jlautos.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// Configurable transporter
const transporter = nodemailer_1.default.createTransport({
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
    }
    else {
        console.log('SMTP Email Service is active and ready.');
    }
});
// 1. Dispatch Booking Alerts to the J&L Autos Agency
const sendAgencyBookingAlert = async (data) => {
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
    }
    catch (err) {
        console.error('[SMTP Alert Trigger Failure]:', err.message);
        console.log('[Mock Email Dispatch] to:', AGENCY_EMAIL);
        console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
        return { mockSent: true, error: err.message };
    }
};
exports.sendAgencyBookingAlert = sendAgencyBookingAlert;
// 2. Dispatch High-End Invoice-Style Confirmation to the Customer
const sendCustomerBookingConfirmation = async (data) => {
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
    }
    catch (err) {
        console.error('[SMTP Alert Trigger Failure]:', err.message);
        console.log('[Mock Email Dispatch] to:', data.customerEmail);
        console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
        return { mockSent: true, error: err.message };
    }
};
exports.sendCustomerBookingConfirmation = sendCustomerBookingConfirmation;
const blastVehicleNewsletter = async (data) => {
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
              <p style="font-size: 13px; color: #8e8e93; font-style: italic; margin-bottom: 20px;">This flagship model is now open for private test drive bookings and luxury offers.</p>
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
    }
    catch (err) {
        console.error('[SMTP Newsletter Blast Failure]:', err.message);
        console.log('[Mock Email Dispatch] bcc recipients:', data.recipients.join(', '));
        console.log('[Mock Email Dispatch] subject:', mailOptions.subject);
        return { mockSent: true, error: err.message };
    }
};
exports.blastVehicleNewsletter = blastVehicleNewsletter;
const COMMON_CSS = `
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0c0e; color: #e5e5e7; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background-color: #121214; border: 1px solid #1f1f23; border-radius: 8px; overflow: hidden; }
  .header { background-color: #0c0c0e; padding: 40px 30px; text-align: center; border-bottom: 1px solid #1f1f23; }
  .logo { color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 10px 0; }
  .logo span { color: #0066ff; }
  .subtitle { color: #8e8e93; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
  .content { padding: 40px 30px; }
  .greeting { font-size: 22px; color: #ffffff; font-weight: 400; text-align: center; margin-bottom: 10px; }
  .status-banner { text-align: center; border: 1px solid #1f1f23; padding: 12px; border-radius: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 13px; margin: 25px 0; }
  .status-pending { background: rgba(0, 102, 255, 0.1); border-color: #0066ff; color: #0066ff; }
  .status-approved { background: rgba(52, 199, 89, 0.1); border-color: #34c759; color: #34c759; }
  .status-modified { background: rgba(255, 159, 10, 0.1); border-color: #ff9f0a; color: #ff9f0a; }
  .status-cancelled { background: rgba(255, 69, 58, 0.1); border-color: #ff453a; color: #ff453a; }
  .status-rejected { background: rgba(255, 69, 58, 0.1); border-color: #ff453a; color: #ff453a; }
  .summary-card { background-color: #0c0c0e; border: 1px solid #1f1f23; border-radius: 6px; padding: 25px; margin-bottom: 30px; }
  .invoice-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1a1a1e; }
  .invoice-row:last-child { border-bottom: none; }
  .inv-label { color: #8e8e93; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
  .inv-val { color: #ffffff; font-size: 15px; font-weight: 500; text-align: right; }
  .dealership-block { background: linear-gradient(135deg, #121214 0%, #17171d 100%); border: 1px dashed #0066ff; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
  .btn-container { text-align: center; margin-top: 35px; }
  .btn { background-color: #0066ff; color: #ffffff !important; padding: 14px 35px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; display: inline-block; }
  .btn-calendar { background-color: #242426; border: 1px solid #1f1f23; color: #e5e5e7 !important; margin-left: 10px; }
  .reason-box { background-color: rgba(255, 69, 58, 0.05); border: 1px solid rgba(255, 69, 58, 0.2); padding: 15px; border-radius: 6px; color: #e5e5e7; margin-bottom: 30px; }
  .footer { background-color: #0c0c0e; padding: 30px; text-align: center; font-size: 12px; color: #48484a; border-top: 1px solid #1f1f23; }
  .footer-text { line-height: 1.6; margin-bottom: 15px; }
`;
/**
 * 4.1 Booking Created Alert (to Customer & Dealership Copy)
 */
const sendTestDriveCreatedEmail = async (data) => {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">J&L <span>AUTOS</span></h1>
          <p class="subtitle">Bespoke Concierge Portal</p>
        </div>
        <div class="content">
          <h2 class="greeting">Dear ${data.customerName},</h2>
          <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px;">
            We have received your request to book a VIP Test Drive. Our sales team is currently checking scheduling availability and will update you shortly.
          </p>
          
          <div class="status-banner status-pending">
            Status: Request Received & Awaiting Approval
          </div>

          <div class="summary-card">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">Booking Overview</h3>
            <div class="invoice-row"><div class="inv-label">Booking Reference:</div><div class="inv-val" style="font-family: monospace; font-weight: bold; color: #0066ff;">#${data.bookingReference}</div></div>
            <div class="invoice-row"><div class="inv-label">Vehicle Selected:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
            <div class="invoice-row"><div class="inv-label">Requested Date:</div><div class="inv-val">${formattedDate}</div></div>
            <div class="invoice-row"><div class="inv-label">Requested Time:</div><div class="inv-val">${data.bookingTime}</div></div>
            ${data.customerNotes ? `<div class="invoice-row"><div class="inv-label">Your Notes:</div><div class="inv-val">${data.customerNotes}</div></div>` : ''}
          </div>

          <div class="dealership-block">
            <h4 style="margin: 0 0 10px 0; color: #0066ff; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Dealership Flagship Showroom</h4>
            <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 500; font-size: 14px;">J&L Autos Luxury Flagship Showroom</p>
            <p style="margin: 0 0 12px 0; color: #a1a1a5; font-size: 13px; line-height: 1.4;">100 Premium Way, Suite 400<br>Beverly Hills, CA 90210</p>
            <p style="margin: 0; color: #8e8e93; font-size: 12px;">Questions? Call Concierge Desk: <strong>+1 (214) 608-0670</strong></p>
          </div>

          <div class="btn-container">
            <a href="${FRONTEND_URL}/dashboard?tab=bookings" class="btn">View Customer Portal</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">This is an automated confirmation of request receipt. You will receive another email once approved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    // Send to Customer
    try {
        await transporter.sendMail({
            from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
            to: data.customerEmail,
            subject: 'Test Drive Booking Request Received',
            html,
        });
    }
    catch (err) {
        console.error('[SMTP Customer Booking Alert Failure]:', err.message);
    }
    // Send to Agency Admin
    try {
        await transporter.sendMail({
            from: `"J&L Autos Concierge" <noreply@jlautos.com>`,
            to: AGENCY_EMAIL,
            subject: `[ALERT] New Test Drive Requested: #${data.bookingReference}`,
            html: html.replace('Dear ' + data.customerName, `Admin Notification - New Test Drive Request from ${data.customerName}`),
        });
    }
    catch (err) {
        console.error('[SMTP Agency Booking Alert Failure]:', err.message);
    }
};
exports.sendTestDriveCreatedEmail = sendTestDriveCreatedEmail;
/**
 * 4.2 Booking Approved Alert (to Customer with Google Link & ICS attachment)
 */
const sendTestDriveApprovedEmail = async (data) => {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">J&L <span>AUTOS</span></h1>
          <p class="subtitle">VIP Luxury Access</p>
        </div>
        <div class="content">
          <h2 class="greeting">Dear ${data.customerName},</h2>
          <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px;">
            Excellent news! Your private test drive booking has been reviewed and approved by our dealership management. Your vehicle reservation is confirmed.
          </p>
          
          <div class="status-banner status-approved">
            Booking Status: Confirmed & Approved
          </div>

          <div class="summary-card">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">Confirmed Appointment</h3>
            <div class="invoice-row"><div class="inv-label">Booking Reference:</div><div class="inv-val" style="font-family: monospace; font-weight: bold; color: #0066ff;">#${data.bookingReference}</div></div>
            <div class="invoice-row"><div class="inv-label">Vehicle Secured:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
            <div class="invoice-row"><div class="inv-label">Scheduled Date:</div><div class="inv-val">${formattedDate}</div></div>
            <div class="invoice-row"><div class="inv-label">Scheduled Time:</div><div class="inv-val">${data.bookingTime}</div></div>
            ${data.dealerNotes ? `<div class="invoice-row"><div class="inv-label">Dealer Instructions:</div><div class="inv-val" style="color: #34c759;">${data.dealerNotes}</div></div>` : ''}
          </div>

          <div class="dealership-block">
            <h4 style="margin: 0 0 10px 0; color: #0066ff; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Appointment Logistics</h4>
            <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 500; font-size: 14px;">J&L Autos Flagship Showroom</p>
            <p style="margin: 0 0 12px 0; color: #a1a1a5; font-size: 13px; line-height: 1.4;">100 Premium Way, Suite 400<br>Beverly Hills, CA 90210</p>
            <p style="margin: 0; color: #8e8e93; font-size: 12px;">Please bring your physical **driving license** and proof of insurance for the test drive experience.</p>
          </div>

          <div class="btn-container">
            <a href="${FRONTEND_URL}/dashboard?tab=bookings" class="btn">Manage Booking</a>
            ${data.googleCalendarLink ? `<a href="${data.googleCalendarLink}" target="_blank" class="btn btn-calendar">Add to Google Calendar</a>` : ''}
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">An offline calendar invitation (.ics) is attached to this email. You can open it to add this event to Apple Calendar, Outlook, or other managers.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const attachments = [];
    if (data.icsContent) {
        attachments.push({
            filename: `test_drive_${data.bookingReference}.ics`,
            content: data.icsContent,
            contentType: 'text/calendar',
        });
    }
    try {
        await transporter.sendMail({
            from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
            to: data.customerEmail,
            subject: 'Your Test Drive Has Been Approved',
            html,
            attachments,
        });
    }
    catch (err) {
        console.error('[SMTP Customer Approved Alert Failure]:', err.message);
    }
};
exports.sendTestDriveApprovedEmail = sendTestDriveApprovedEmail;
/**
 * 4.3 Booking Modified Alert (to Customer)
 */
const sendTestDriveModifiedEmail = async (data) => {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">J&L <span>AUTOS</span></h1>
          <p class="subtitle">Bespoke Rescheduling</p>
        </div>
        <div class="content">
          <h2 class="greeting">Dear ${data.customerName},</h2>
          <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px;">
            Your test drive booking has been updated by the dealership. Please review the updated scheduling information below.
          </p>
          
          <div class="status-banner status-modified">
            Booking Status: Modified by Dealer
          </div>

          <div class="summary-card">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">New Appointment Details</h3>
            <div class="invoice-row"><div class="inv-label">Booking Reference:</div><div class="inv-val" style="font-family: monospace; font-weight: bold; color: #0066ff;">#${data.bookingReference}</div></div>
            <div class="invoice-row"><div class="inv-label">Vehicle Assigned:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
            <div class="invoice-row"><div class="inv-label">Updated Date:</div><div class="inv-val">${formattedDate}</div></div>
            <div class="invoice-row"><div class="inv-label">Updated Time Slot:</div><div class="inv-val">${data.bookingTime}</div></div>
            ${data.dealerNotes ? `<div class="invoice-row"><div class="inv-label">Dealer Message:</div><div class="inv-val" style="color: #ff9f0a;">${data.dealerNotes}</div></div>` : ''}
          </div>

          <div class="btn-container">
            <a href="${FRONTEND_URL}/dashboard?tab=bookings" class="btn">Accept or Manage</a>
            ${data.googleCalendarLink ? `<a href="${data.googleCalendarLink}" target="_blank" class="btn btn-calendar">Update Google Calendar</a>` : ''}
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">The updated calendar invite (.ics) is attached to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    const attachments = [];
    if (data.icsContent) {
        attachments.push({
            filename: `updated_test_drive_${data.bookingReference}.ics`,
            content: data.icsContent,
            contentType: 'text/calendar',
        });
    }
    try {
        await transporter.sendMail({
            from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
            to: data.customerEmail,
            subject: 'Your Test Drive Booking Has Been Updated',
            html,
            attachments,
        });
    }
    catch (err) {
        console.error('[SMTP Customer Modified Alert Failure]:', err.message);
    }
};
exports.sendTestDriveModifiedEmail = sendTestDriveModifiedEmail;
/**
 * 4.4 Booking Cancelled Alert (to Customer & Dealership Copy)
 */
const sendTestDriveCancelledEmail = async (data) => {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">J&L <span>AUTOS</span></h1>
          <p class="subtitle">Cancellation Notice</p>
        </div>
        <div class="content">
          <h2 class="greeting">Dear ${data.customerName},</h2>
          <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px;">
            This email confirms that your test drive booking has been cancelled.
          </p>
          
          <div class="status-banner status-cancelled">
            Booking Status: Cancelled
          </div>

          ${data.cancellationReason ? `
          <div class="reason-box">
            <strong style="display: block; font-size: 12px; text-transform: uppercase; color: #ff453a; margin-bottom: 5px;">Cancellation Reason:</strong>
            <p style="margin: 0; font-size: 14px; font-weight: light; line-height: 1.4;">${data.cancellationReason}</p>
          </div>
          ` : ''}

          <div class="summary-card">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">Cancelled Appointment Details</h3>
            <div class="invoice-row"><div class="inv-label">Booking Reference:</div><div class="inv-val" style="font-family: monospace;">#${data.bookingReference}</div></div>
            <div class="invoice-row"><div class="inv-label">Vehicle Selected:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
            <div class="invoice-row"><div class="inv-label">Original Date:</div><div class="inv-val">${formattedDate}</div></div>
            <div class="invoice-row"><div class="inv-label">Original Time:</div><div class="inv-val">${data.bookingTime}</div></div>
          </div>

          <p style="text-align: center; font-size: 13px; color: #8e8e93;">
            If you wish to reschedule, please visit our digital showroom or contact the concierge desk at +1 (214) 608-0670.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 J&L Autos. Transactional Cancellation Confirmation.
        </div>
      </div>
    </body>
    </html>
  `;
    // Send to Customer
    try {
        await transporter.sendMail({
            from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
            to: data.customerEmail,
            subject: 'Your Test Drive Booking Has Been Cancelled',
            html,
        });
    }
    catch (err) {
        console.error('[SMTP Customer Cancelled Alert Failure]:', err.message);
    }
    // Send copy to Agency Admin
    try {
        await transporter.sendMail({
            from: `"J&L Autos Concierge" <noreply@jlautos.com>`,
            to: AGENCY_EMAIL,
            subject: `[CANCELLED] Test Drive Booking #${data.bookingReference}`,
            html: html.replace('Dear ' + data.customerName, `Admin Notification - Booking Cancelled for ${data.customerName}`),
        });
    }
    catch (err) {
        console.error('[SMTP Agency Cancelled Alert Failure]:', err.message);
    }
};
exports.sendTestDriveCancelledEmail = sendTestDriveCancelledEmail;
/**
 * 4.5 Booking Rejected Alert (to Customer)
 */
const sendTestDriveRejectedEmail = async (data) => {
    const formattedDate = new Date(data.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${COMMON_CSS}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">J&L <span>AUTOS</span></h1>
          <p class="subtitle">Bespoke Concierge Service</p>
        </div>
        <div class="content">
          <h2 class="greeting">Dear ${data.customerName},</h2>
          <p style="text-align: center; color: #a1a1a5; line-height: 1.5; font-size: 15px;">
            Thank you for your interest in J&L Autos. Unfortunately, we were unable to approve your booking request for the selected date and time.
          </p>
          
          <div class="status-banner status-rejected">
            Booking Status: Request Not Approved
          </div>

          <div class="reason-box">
            <strong style="display: block; font-size: 12px; text-transform: uppercase; color: #ff453a; margin-bottom: 5px;">Reason for Rejection:</strong>
            <p style="margin: 0; font-size: 14px; font-weight: light; line-height: 1.4;">${data.rejectionReason}</p>
          </div>

          <div class="summary-card">
            <h3 style="color: #ffffff; margin-top: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f1f23; padding-bottom: 10px; margin-bottom: 15px;">Requested Event Details</h3>
            <div class="invoice-row"><div class="inv-label">Booking Reference:</div><div class="inv-val" style="font-family: monospace;">#${data.bookingReference}</div></div>
            <div class="invoice-row"><div class="inv-label">Vehicle Requested:</div><div class="inv-val">${data.vehicleDetails.year} ${data.vehicleDetails.make} ${data.vehicleDetails.model}</div></div>
            <div class="invoice-row"><div class="inv-label">Requested Date:</div><div class="inv-val">${formattedDate}</div></div>
            <div class="invoice-row"><div class="inv-label">Requested Time Slot:</div><div class="inv-val">${data.bookingTime}</div></div>
          </div>

          <p style="text-align: center; font-size: 13px; color: #8e8e93; max-width: 450px; margin: 0 auto;">
            We invite you to submit a new scheduling request with alternative timings or contact our concierge directly to coordinate a customized visit.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 J&L Autos. Transactional Update Notice.
        </div>
      </div>
    </body>
    </html>
  `;
    try {
        await transporter.sendMail({
            from: `"J&L Autos Showroom" <concierge@jlautos.com>`,
            to: data.customerEmail,
            subject: 'Your Test Drive Request Was Not Approved',
            html,
        });
    }
    catch (err) {
        console.error('[SMTP Customer Rejected Alert Failure]:', err.message);
    }
};
exports.sendTestDriveRejectedEmail = sendTestDriveRejectedEmail;
//# sourceMappingURL=emailService.js.map