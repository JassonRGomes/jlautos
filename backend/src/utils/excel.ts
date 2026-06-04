import ExcelJS from 'exceljs';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';

export const generateExcelReport = async (
  res: Response,
  sheetName: string,
  headers: string[],
  rows: string[][],
  filename: string,
  logoUrl?: string | null
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Styling helper variables
  const primaryBlue = 'FF0066FF';
  const graphiteGrey = 'FF8E8E93';

  // Title Row
  const titleRow = worksheet.addRow(['J&L AUTOS - ' + sheetName.toUpperCase()]);
  titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells('A1:F1');
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0C0C0E' }
  };
  titleRow.height = 45;
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Handle Logo Injection
  if (logoUrl) {
    let resolvedLogoPath = '';
    if (logoUrl.startsWith('/uploads/')) {
      resolvedLogoPath = path.join(__dirname, '../../public', logoUrl);
    } else {
      resolvedLogoPath = path.join(__dirname, '../../public/uploads', logoUrl);
    }

    if (fs.existsSync(resolvedLogoPath)) {
      try {
        let ext: 'jpeg' | 'png' | 'gif' = 'png';
        const lowerPath = resolvedLogoPath.toLowerCase();
        if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) ext = 'jpeg';
        else if (lowerPath.endsWith('.gif')) ext = 'gif';

        const imageId = workbook.addImage({
          filename: resolvedLogoPath,
          extension: ext,
        });

        worksheet.addImage(imageId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 50, height: 50 }
        });
        
        titleRow.height = 55;
      } catch (err) {
        console.error('[Excel logo embedding error]:', err);
      }
    }
  }

  // Spacing Row
  worksheet.addRow([]);

  // Headers Row
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  
  headers.forEach((_, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: primaryBlue }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // Adding Data Rows
  rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.addRow(row);
    dataRow.height = 20;
    dataRow.font = { name: 'Arial', size: 10 };

    row.forEach((_, colIndex) => {
      const cell = dataRow.getCell(colIndex + 1);
      
      // Zebra striping
      if (rowIndex % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F7' }
        };
      }

      cell.border = {
        top: { style: 'hair' },
        left: { style: 'hair' },
        bottom: { style: 'hair' },
        right: { style: 'hair' }
      };
      
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });

  // Adjust column widths automatically
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    // Cap maximum width at 50 to prevent huge columns
    column.width = Math.min(Math.max(maxLength + 4, 12), 50);
  });

  // Send to response
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}`
  );

  await workbook.xlsx.write(res);
  res.end();
};
