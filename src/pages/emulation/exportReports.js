import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const formatColumns = (worksheet) => {
  // Auto width từng cột
  worksheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    col.width = maxLength + 2;
  });

  // Format header (row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' }, // Màu xanh nhạt header
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Format toàn bộ cell border
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });
};


export const exportWeeklyReport = async (data) => {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Chuyên cần
  const attendanceSheet = workbook.addWorksheet('Chuyên cần');
  attendanceSheet.addRow(['STT', 'Lớp', 'Sĩ số', 'Có mặt', 'Vắng']);
  data.attendanceSummary.forEach((item, index) => {
    attendanceSheet.addRow([index + 1, item.className, item.total, item.present, item.absent]);
  });
  formatColumns(attendanceSheet);

  // Sheet 2: Vệ sinh
  const hygieneSheet = workbook.addWorksheet('Vệ sinh');
  hygieneSheet.addRow(['STT', 'Lớp', 'Điểm vệ sinh']);
  data.hygieneSummary.forEach((item, index) => {
    hygieneSheet.addRow([index + 1, item.className, item.score]);
  });
  formatColumns(hygieneSheet);

  // Sheet 3: Lineup
  const lineupSheet = workbook.addWorksheet('Lineup');
  lineupSheet.addRow(['STT', 'Lớp', 'Điểm lineup']);
  data.lineupSummary.forEach((item, index) => {
    lineupSheet.addRow([index + 1, item.className, item.score]);
  });
  formatColumns(lineupSheet);

  // Sheet 4+: Vi phạm từng lớp
  Object.entries(data.violationsByClass).forEach(([className, violations]) => {
    const classSheet = workbook.addWorksheet(className);
    classSheet.addRow(['STT', 'Họ tên', 'Lỗi', 'Thời gian']);
    violations.forEach((v, index) => {
      classSheet.addRow([index + 1, v.studentName, v.violationName, v.date]);
    });
    formatColumns(classSheet);
  });

  // Xuất file
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `BaoCaoTuan_${data.weekNumber}.xlsx`);
};