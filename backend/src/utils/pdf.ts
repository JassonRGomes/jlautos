import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

// Helper to draw premium gold shield logo vector
const drawVectorLogo = (doc: any, logoX: number, logoY: number) => {
  doc.save();

  // Outer shield shape
  doc.lineWidth(2);
  doc.strokeColor('#D4AF37'); // Luxury Gold
  doc.moveTo(logoX, logoY - 24)
     .lineTo(logoX + 20, logoY - 14)
     .lineTo(logoX + 20, logoY + 8)
     .quadraticCurveTo(logoX + 20, logoY + 22, logoX, logoY + 26)
     .quadraticCurveTo(logoX - 20, logoY + 22, logoX - 20, logoY + 8)
     .lineTo(logoX - 20, logoY - 14)
     .closePath()
     .stroke();

  // Inner shield shape
  doc.lineWidth(1);
  doc.moveTo(logoX, logoY - 19)
     .lineTo(logoX + 15, logoY - 11)
     .lineTo(logoX + 15, logoY + 6)
     .quadraticCurveTo(logoX + 15, logoY + 17, logoX, logoY + 20)
     .quadraticCurveTo(logoX - 15, logoY + 17, logoX - 15, logoY + 6)
     .lineTo(logoX - 15, logoY - 11)
     .closePath()
     .stroke();

  // Luxury Monogram text in the center
  doc.fillColor('#D4AF37')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('J&L', logoX - 15, logoY - 5, { width: 30, align: 'center' });

  doc.restore();
};

export const generatePDFReport = (
  res: Response,
  title: string,
  headers: string[],
  rows: string[][],
  summaryText: string,
  logoUrl?: string | null,
  colWidths?: number[]
) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  // Styling helpers
  const primaryColor = '#0066FF';
  const textColor = '#1C1C1E';
  const lightGrey = '#F2F2F7';
  const darkGrey = '#8E8E93';

  // 1. Logo & Header Section
  let hasImageLogo = false;
  let resolvedLogoPath = '';

  if (logoUrl) {
    if (logoUrl.startsWith('/uploads/')) {
      resolvedLogoPath = path.join(__dirname, '../../public', logoUrl);
    } else {
      resolvedLogoPath = path.join(__dirname, '../../public/uploads', logoUrl);
    }

    if (fs.existsSync(resolvedLogoPath)) {
      hasImageLogo = true;
    }
  }

  // Draw Logo (Left side)
  if (hasImageLogo) {
    try {
      doc.image(resolvedLogoPath, 50, 50, { width: 50, height: 50 });
    } catch (imageError) {
      console.error('[PDF logo drawing error, falling back to vector]:', imageError);
      drawVectorLogo(doc, 75, 75);
    }
  } else {
    drawVectorLogo(doc, 75, 75);
  }

  // Corporate Brand Names (beside logo)
  doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('J&L AUTOS', 115, 58, { characterSpacing: 1.5 });
  doc.fillColor(textColor).fontSize(9).font('Helvetica').text('PREMIUM LUXURY SHOWROOM PORTFOLIO', 115, 84, { characterSpacing: 1 });

  // Top header division line
  doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#E5E5EA').stroke();

  // 2. Title & Date
  doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold').text(title.toUpperCase(), 50, 132);
  doc.fillColor(darkGrey).fontSize(8.5).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, 50, 150);

  // 3. Executive Summary Card (Overlap-proof block positioning)
  const boxTop = 168;
  const boxHeight = 52;

  doc.roundedRect(50, boxTop, 495, boxHeight, 4).fillAndStroke(lightGrey, '#E5E5EA');

  // Draw text inside Summary Card
  doc.fillColor(textColor).fontSize(9.5).font('Helvetica-Bold').text('EXECUTIVE METRICS OVERVIEW', 65, boxTop + 10);
  doc.fillColor(textColor).fontSize(8.5).font('Helvetica').text(summaryText, 65, boxTop + 24, { width: 465 });

  // 4. Grid Table Rendering
  const tableTop = boxTop + boxHeight + 20; // Exact, overlap-proof coordinate (240)
  const colCount = headers.length;

  // Print Table Headers with dynamic height to prevent text overlaps
  doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
  
  let maxHeaderHeight = 12;
  headers.forEach((header, index) => {
    const colWidth = colWidths ? colWidths[index] : (495 / colCount);
    const hHeight = doc.heightOfString(header.toUpperCase(), { width: colWidth });
    if (hHeight > maxHeaderHeight) {
      maxHeaderHeight = hHeight;
    }
  });

  const headerRowHeight = maxHeaderHeight + 6;

  headers.forEach((header, index) => {
    const colWidth = colWidths ? colWidths[index] : (495 / colCount);
    let cellX = 50;
    for (let i = 0; i < index; i++) {
      cellX += colWidths ? colWidths[i] : (495 / colCount);
    }

    doc.text(header.toUpperCase(), cellX, tableTop, {
      width: colWidth,
      align: index === colCount - 1 ? 'right' : 'left'
    });
  });

  // Header separator line
  doc.moveTo(50, tableTop + headerRowHeight).lineTo(545, tableTop + headerRowHeight).strokeColor('#E5E5EA').stroke();

  // Print Table Rows with dynamic height calculations and repeated headers on new page
  let currentY = tableTop + headerRowHeight + 6;
  doc.fillColor(textColor).fontSize(9).font('Helvetica');

  rows.forEach((row, rowIndex) => {
    // Calculate maximum row height required for the cells of this row
    let maxCellHeight = 16;
    row.forEach((cell, cellIndex) => {
      const colWidth = colWidths ? colWidths[cellIndex] : (495 / colCount);
      const cellHeight = doc.heightOfString(cell, { width: colWidth });
      if (cellHeight > maxCellHeight) {
        maxCellHeight = cellHeight;
      }
    });

    const rowHeight = maxCellHeight + 6;

    // Check if table row extends beyond print margin (if so, create a new page with headers)
    if (currentY + rowHeight > 760) {
      doc.addPage();

      // Reprint Table Headers on the new page
      const newPageTableTop = 50;
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
      
      headers.forEach((header, index) => {
        const colWidth = colWidths ? colWidths[index] : (495 / colCount);
        let cellX = 50;
        for (let i = 0; i < index; i++) {
          cellX += colWidths ? colWidths[i] : (495 / colCount);
        }

        doc.text(header.toUpperCase(), cellX, newPageTableTop, {
          width: colWidth,
          align: index === colCount - 1 ? 'right' : 'left'
        });
      });

      // Draw header separator line on new page
      doc.moveTo(50, newPageTableTop + headerRowHeight).lineTo(545, newPageTableTop + headerRowHeight).strokeColor('#E5E5EA').stroke();

      currentY = newPageTableTop + headerRowHeight + 6;
      doc.fillColor(textColor).fontSize(9).font('Helvetica');
    }

    // Row alternating background
    if (rowIndex % 2 === 1) {
      doc.rect(50, currentY - 3, 495, rowHeight).fill('#F9F9FB');
      doc.fillColor(textColor); // Reset color
    }

    row.forEach((cell, cellIndex) => {
      const colWidth = colWidths ? colWidths[cellIndex] : (495 / colCount);
      let cellX = 50;
      for (let i = 0; i < cellIndex; i++) {
        cellX += colWidths ? colWidths[i] : (495 / colCount);
      }

      doc.text(cell, cellX, currentY, {
        width: colWidth,
        align: cellIndex === colCount - 1 ? 'right' : 'left'
      });
    });

    currentY += rowHeight;
  });

  // Page Footer Text
  doc.fontSize(8).fillColor(darkGrey).text(
    'CONFIDENTIAL REPORT - FOR J&L AUTOS INTERNAL ADMINISTRATIVE CRM ROLES ONLY',
    50,
    780,
    { align: 'center', width: 495 }
  );

  doc.end();
};

