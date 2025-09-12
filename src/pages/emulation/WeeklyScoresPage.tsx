import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack, Snackbar, Alert
} from '@mui/material';
import api from '../../api/api';
import ExcelJS from 'exceljs';

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassInfo {
  _id: string;
  className: string;
  grade: string;
}

interface WeeklyScore {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100); // lấy từ settings
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'success'
  });

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchDisciplineMax();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error('Lỗi khi lấy weeks:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy classes:', err);
    }
  };

  const fetchDisciplineMax = async () => {
    try {
      const res = await api.get('/api/settings');
      setDisciplineMax(res.data.disciplineMax || 100);
    } catch (err) {
      console.error('Không load được settings:', err);
    }
  };

  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get('/api/class-weekly-scores', {
        params: { weekNumber: selectedWeek.weekNumber }
      });

      let loadedScores: WeeklyScore[] = res.data || [];

      // Ghép với danh sách lớp, lớp nào chưa có thì gán mặc định
      const merged = classes.map(cls => {
        const found = loadedScores.find(s => s.className === cls.className);
        return found || {
          className: cls.className,
          grade: cls.grade,
          academicScore: 0,
          bonusScore: 0,
          disciplineScore: 0,
          hygieneScore: 0,
          attendanceScore: 0,
          lineUpScore: 0,
          totalViolation: 0,
          totalScore: 0,
          rank: 0
        };
      });

      setScores(merged);

      if (res.data.length === 0) {
        setSnackbar({ open: true, message: 'Chưa có dữ liệu tuần này. Bạn có thể nhập và tính mới.', severity: 'info' });
      }
    } catch (err) {
      console.error('Lỗi khi load scores:', err);
    }
  };

  const calculateTotals = () => {
    const updated = scores.map(s => {
      const totalViolation =
        (disciplineMax - s.disciplineScore) +
        s.hygieneScore +
        s.attendanceScore +
        s.lineUpScore;

      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    updated.sort((a, b) => b.totalScore - a.totalScore);
    updated.forEach((s, idx) => { s.rank = idx + 1; });

    setScores([...updated]);
    setSnackbar({ open: true, message: 'Đã tính tổng & xếp hạng.', severity: 'success' });
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post('/api/class-weekly-scores', {
        weekNumber: selectedWeek.weekNumber,
        scores
      });
      setSnackbar({ open: true, message: 'Đã lưu dữ liệu tuần thành công!', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
    }
  };

  const handleExport = async () => {
    if (!selectedWeek) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tổng hợp thi đua');

    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').value = `BẢNG XẾP LOẠI THI ĐUA - TUẦN ${selectedWeek.weekNumber}`;
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    const header = [
      "Lớp", "SĐB", "Điểm thưởng", "Kỷ luật", "Vệ sinh",
      "Chuyên cần", "Xếp hàng", "Tổng nề nếp", "Tổng", "Hạng"
    ];
    sheet.addRow([]);
    sheet.addRow(header);

    scores.forEach(cls => {
      sheet.addRow([
        cls.className,
        cls.academicScore,
        cls.bonusScore,
        cls.disciplineScore,
        cls.hygieneScore,
        cls.attendanceScore,
        cls.lineUpScore,
        cls.totalViolation,
        cls.totalScore,
        cls.rank
      ]);
    });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ThiDua_Tuan${selectedWeek.weekNumber}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRowStyle = (rank: number) => {
    switch (rank) {
      case 1: return { backgroundColor: '#ffe082' };
      case 2: return { backgroundColor: '#b2ebf2' };
      case 3: return { backgroundColor: '#c8e6c9' };
      default: return {};
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ''}
          onChange={(e) => {
            const week = weeks.find(w => w._id === e.target.value) || null;
            setSelectedWeek(week);
            setScores([]);
          }}
          sx={{ width: 150 }}
        >
          {weeks.map(w => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={fetchScores}>🔄 Tải dữ liệu</Button>
        <Button variant="contained" color="warning" onClick={calculateTotals}>➕ Tính tổng & xếp hạng</Button>
        <Button variant="contained" color="success" onClick={handleSave}>💾 Lưu</Button>
        <Button variant="contained" color="success" onClick={handleExport}>📤 Xuất Excel</Button>
      </Stack>

      <Table component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>SĐB</TableCell>
            <TableCell>Điểm thưởng</TableCell>
            <TableCell>Kỷ luật</TableCell>
            <TableCell>Vệ sinh</TableCell>
            <TableCell>Chuyên cần</TableCell>
            <TableCell>Xếp hàng</TableCell>
            <TableCell>Tổng nề nếp</TableCell>
            <TableCell>Tổng</TableCell>
            <TableCell>Xếp hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((cls, idx) => (
            <TableRow key={cls.className} sx={getRowStyle(cls.rank)}>
              <TableCell align="center">{idx + 1}</TableCell>
              <TableCell align="center">{cls.className}</TableCell>
              <TableCell align="center">{cls.academicScore}</TableCell>
              <TableCell align="center">{cls.bonusScore}</TableCell>
              <TableCell align="center">{cls.disciplineScore}</TableCell>
              <TableCell align="center">{cls.hygieneScore}</TableCell>
              <TableCell align="center">{cls.attendanceScore}</TableCell>
              <TableCell align="center">{cls.lineUpScore}</TableCell>
              <TableCell align="center">{cls.totalViolation}</TableCell>
              <TableCell align="center">{cls.totalScore}</TableCell>
              <TableCell align="center">{cls.rank}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
