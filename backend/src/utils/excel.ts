import ExcelJS from 'exceljs';
import { Response } from 'express';

export const generateExcelReport = async (
  res: Response,
  sheetName: string,
  headers: string[],
  rows: string[][],
  filename: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Styling helper variables
  const primaryBlue = 'FF0066FF';
  const graphiteGrey = 'FF8E8E93';

  // Title Row
  const titleRow = worksheet.addRow(['J&L AUTOS - PREMIUM SHOWROOM CRM']);
  titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells('A1:F1');
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0C0C0E' }
  };
  titleRow.height = 35;
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

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
      
      cell.alignment = { vertical: 'middle' };
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
    column.width = Math.max(maxLength + 4, 12);
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
