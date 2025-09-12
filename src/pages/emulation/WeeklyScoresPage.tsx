import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack, Snackbar, Alert
} from '@mui/material';
import axios from 'axios';
import ExcelJS from 'exceljs';

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface WeeklyScore {
  className: string;
  grade: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalScore: number;
  rank: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'success'
  });

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await axios.get('/api/academic-weeks/study-weeks');
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0]);
      }
    } catch (err) {
      console.error('Lỗi khi lấy weeks:', err);
    }
  };

  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await axios.get('/api/class-weekly-scores', {
        params: { weekNumber: selectedWeek.weekNumber }
      });
      if (res.data.length === 0) {
        setScores([]);
        setSnackbar({ open: true, message: 'Chưa có dữ liệu tuần này. Bấm "Lấy dữ liệu" để tính.', severity: 'info' });
      } else {
        setScores(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi load scores:', err);
    }
  };

  const handleCalculate = async () => {
    if (!selectedWeek) return;
    try {
      const res = await axios.post('/api/class-weekly-scores/calculate', {
        weekNumber: selectedWeek.weekNumber
      });
      setScores(res.data);
      setSnackbar({ open: true, message: 'Đã tính xong dữ liệu. Bấm "Tính tổng & xếp hạng" tiếp theo.', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi calculate:', err);
    }
  };

  const handleCalculateTotalAndRank = async () => {
    if (!selectedWeek) return;
    try {
      const res = await axios.post('/api/class-weekly-scores/calculate-total-rank', {
        weekNumber: selectedWeek.weekNumber
      });
      setScores(res.data);
      setSnackbar({ open: true, message: 'Đã tính tổng & xếp hạng.', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi calculate total & rank:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await axios.post('/api/class-weekly-scores', {
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

    // Ghi tiêu đề
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = `BẢNG XẾP LOẠI THI ĐUA - TUẦN ${selectedWeek.weekNumber}`;
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    const header = ["Lớp", "SĐB", "Kỷ luật", "Chuyên cần", "Vệ sinh", "Tổng", "Hạng"];
    sheet.addRow([]);
    sheet.addRow(header);

    scores.forEach(cls => {
      sheet.addRow([
        cls.className,
        cls.academicScore,
        cls.disciplineScore,
        cls.attendanceScore,
        cls.hygieneScore,
        cls.totalScore,
        cls.rank === 0 ? 'Không' : cls.rank,
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
        <Button variant="contained" color="primary" onClick={handleCalculate}>📥 Lấy dữ liệu</Button>
        <Button variant="contained" color="warning" onClick={handleCalculateTotalAndRank}>➕ Tính tổng & xếp hạng</Button>
        <Button variant="contained" color="success" onClick={handleSave}>💾 Lưu</Button>
        <Button variant="contained" color="success" onClick={handleExport}>Xuất file thi đua</Button>
      </Stack>

      <Table component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>Điểm SĐB</TableCell>
            <TableCell>Điểm kỷ luật</TableCell>
            <TableCell>Điểm vệ sinh</TableCell>
            <TableCell>Điểm chuyên cần</TableCell>
            <TableCell>Điểm xếp hàng</TableCell>
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
              <TableCell align="center">{cls.disciplineScore}</TableCell>
              <TableCell align="center">{cls.hygieneScore}</TableCell>
              <TableCell align="center">{cls.attendanceScore}</TableCell>
              <TableCell align="center">{cls.lineUpScore}</TableCell>
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
