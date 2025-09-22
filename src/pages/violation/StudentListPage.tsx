const Student = require('../models/Student');
const XLSX = require('xlsx');

exports.importExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Excel: Tên, Lớp
    let inserted = 0;
    let updated = 0;

    for (let r of rows) {
      const name = r['Tên']?.trim();
      const className = r['Lớp']?.trim();

      if (!name || !className) continue;

      // Tìm học sinh theo tên + lớp
      const existing = await Student.findOne({ name, className });
      if (existing) {
        // Nếu đã có thì có thể update thêm các trường khác nếu cần
        await Student.updateOne({ _id: existing._id }, { name, className });
        updated++;
      } else {
        // Nếu chưa có thì thêm mới
        await Student.create({ name, className });
        inserted++;
      }
    }

    res.json({
      message: 'Import thành công',
      inserted,
      updated,
      total: inserted + updated,
    });
  } catch (err) {
    console.error('Lỗi import:', err);
    res.status(500).json({ error: 'Lỗi import' });
  }
};

exports.getByClass = async (req, res) => {
  try {
    const { className } = req.query;
    const students = await Student.find(className ? { className } : {});
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách' });
  }
};

exports.updatePhones = async (req, res) => {
  try {
    const updates = req.body; // [{_id, fatherPhone, motherPhone}, ...]
    for (let u of updates) {
      await Student.findByIdAndUpdate(u._id, {
        fatherPhone: u.fatherPhone,
        motherPhone: u.motherPhone,
      });
    }
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật' });
  }
};
