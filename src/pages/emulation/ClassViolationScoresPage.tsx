import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Stack, Snackbar, Alert
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  penalty: number;
  weekNumber: number;
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ClassDisciplineTotalPage() {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [totalScores, setTotalScores] = useState<{ className: string, total: number }[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await axios.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy tuần:', err);
    }
  };

  const fetchViolations = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: 'Vui lòng chọn tuần.', severity: 'error' });
      return;
    }

    try {
      const res = await axios.get('/api/violations/all/all-student');
      const data: Violation[] = res.data;

      const filtered = data.filter(v => v.weekNumber === selectedWeek.weekNumber);
      setViolations(filtered);

      // ✅ Tính tổng điểm theo lớp
      const group: { [key: string]: number } = {};
      filtered.forEach(v => {
        if (!group[v.className]) group[v.className] = v.penalty;
        else group[v.className] += v.penalty;
      });

      const result = Object.entries(group).map(([className, total]) => ({ className, total }));
      setTotalScores(result);

      setSnackbar({ open: true, message: 'Đã tính tổng điểm kỷ luật.', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi lấy vi phạm:', err);
      setSnackbar({ open: true, message: 'Lỗi khi tải dữ liệu.', severity: 'error' });
    }
  };

  const handleSaveScores = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: 'Vui lòng chọn tuần.', severity: 'error' });
      return;
    }

    try {
      for (const score of totalScores) {
        await axios.post('/api/class-violation-scores', {
          className: score.className,
          weekNumber: selectedWeek.weekNumber,
          totalScore: score.total,
        });
      }

      setSnackbar({ open: true, message: 'Đã lưu điểm kỷ luật thành công.', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi lưu điểm:', err);
      setSnackbar({ open: true, message: 'Lỗi khi lưu điểm.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Tổng điểm kỷ luật các lớp theo tuần
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Tuần"
            select
            value={selectedWeek?._id || ''}
            onChange={(e) => {
              const w = weekList.find(w => w._id === e.target.value);
              setSelectedWeek(w || null);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">-- Chọn tuần --</MenuItem>
            {weekList.map((w) => (
              <MenuItem key={w._id} value={w._id}>
                Tuần {w.weekNumber}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={fetchViolations}>Tải dữ liệu & Tính tổng</Button>
          <Button variant="contained" color="success" onClick={handleSaveScores}>Lưu điểm kỷ luật</Button>
        </Stack>

        {selectedWeek && (
          <Typography variant="body2" mt={2}>
            Thời gian: {dayjs(selectedWeek.startDate).format('DD/MM')} - {dayjs(selectedWeek.endDate).format('DD/MM')}
          </Typography>
        )}
      </Paper>

      <Paper elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Tổng điểm kỷ luật</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {totalScores.length > 0 ? totalScores.map((row, i) => (
              <TableRow key={row.className}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.total}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} align="center">Chưa có dữ liệu.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
