import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Define structures for our reports
interface ReportItem {
  id?: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  eventType?: string;
  bookingDate?: Date;
  offerAmount?: number;
}

export const generatePDFReport = (
  res: Response,
  title: string,
  headers: string[],
  rows: string[][],
  summaryText: string
) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // Styling helpers
  const primaryColor = '#0066FF';
  const textColor = '#1C1C1E';
  const lightGrey = '#F2F2F7';
  const darkGrey = '#8E8E93';

  // 1. Header Section
  doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('J&L AUTOS', { letterSpacing: 2 });
  doc.fillColor(textColor).fontSize(10).font('Helvetica').text('PREMIUM LUXURY SHOWROOM PORTFOLIO', { letterSpacing: 1 });
  doc.moveDown(1);
  
  // Title
  doc.fillColor(textColor).fontSize(16).font('Helvetica-Bold').text(title.toUpperCase());
  doc.moveDown(0.2);
  doc.fillColor(darkGrey).fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(1.5);

  // 2. Summary Card
  doc.roundedRect(50, doc.y, 495, 45, 4).fillAndStroke(lightGrey, '#E5E5EA');
  doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('EXECUTIVE METRICS OVERVIEW', 65, doc.y - 35);
  doc.fillColor(textColor).fontSize(9).font('Helvetica').text(summaryText, 65, doc.y - 20);
  doc.moveDown(2);

  // 3. Grid Table Rendering
  const tableTop = doc.y + 20;
  const colCount = headers.length;
  const colWidth = 495 / colCount;

  // Print Table Headers
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
  headers.forEach((header, index) => {
    doc.text(header.toUpperCase(), 50 + (index * colWidth), tableTop, {
      width: colWidth,
      align: index === colCount - 1 ? 'right' : 'left'
    });
  });

  // Header separator line
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#E5E5EA').stroke();

  // Print Table Rows
  let currentY = tableTop + 22;
  doc.fillColor(textColor).fontSize(9).font('Helvetica');

  rows.forEach((row, rowIndex) => {
    // Add page if table extends beyond margin
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }

    // Row alternating background
    if (rowIndex % 2 === 1) {
      doc.rect(50, currentY - 4, 495, 18).fill('#F9F9FB').stroke();
      doc.fillColor(textColor); // Reset fill color
    }

    row.forEach((cell, cellIndex) => {
      doc.text(cell, 50 + (cellIndex * colWidth), currentY, {
        width: colWidth,
        align: cellIndex === colCount - 1 ? 'right' : 'left'
      });
    });

    currentY += 18;
  });

  // Footer text
  doc.fontSize(8).fillColor(darkGrey).text(
    'CONFIDENTIAL REPORT - FOR J&L AUTOS INTERNAL ADMINISTRATIVE CRM ROLES ONLY',
    50,
    780,
    { align: 'center', width: 495 }
  );

  doc.end();
};
