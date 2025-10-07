
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Divider,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Select,
  Snackbar,
  Alert,
} from '@mui/material';
import api from '../../api/api';

// 🔧 Hàm tiện ích thay thế moment
const getWeekNumber = (dateStr: string) => {
  const date = new Date(dateStr);
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstJan.getTime()) / 86400000);
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
};
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const formatInputDate = (date: Date) => date.toISOString().split('T')[0];

interface Violation {
  _id: string;
  className: string;
  date: string;
  session: string;
  violation: string;
  studentName?: string;
  note?: string;
  recorder: string;
}

interface WeeklyScore {
  _id: string;
  className: string;
  weekNumber: number;
  year: number;
  lineUpScore: number;
  violationCount: number;
}

export default function ClassLineUpSummaryPage() {
  const [className, setClassName] = useState('');
  const [violation, setViolation] = useState('');
  const [recorder, setRecorder] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(formatInputDate(new Date()));
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });

  const classOptions = ['10A1', '10A2', '10A3'];
  const violationOptions = [
    'Xếp hàng chậm',
    'Mất trật tự giờ chào cờ',
    'Nhiều HS ngồi trong lớp giờ xếp hàng',
    'Di chuyển mất trật tự không theo hàng',
  ];
  const recorderOptions = ['Thầy Năm', 'Thầy Huy'];

  const handleSubmit = async () => {
    if (!className || !violation || !recorder) {
      setSnackbar({ open: true, message: 'Vui lòng chọn đầy đủ thông tin', type: 'error' });
      return;
    }

    try {
      await api.post('/class-lineup-summaries', {
        className,
        violation,
        recorder,
        note,
        date,
      });
      setSnackbar({ open: true, message: 'Ghi nhận thành công', type: 'success' });
      loadViolations();
      loadWeeklyScores();
    } catch {
      setSnackbar({ open: true, message: 'Lỗi khi ghi nhận', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa vi phạm này?')) return;
    try {
      await api.delete(`/class-lineup-summaries/${id}`);
      setSnackbar({ open: true, message: 'Đã xóa vi phạm', type: 'success' });
      loadViolations();
      loadWeeklyScores();
    } catch {
      setSnackbar({ open: true, message: 'Lỗi khi xóa', type: 'error' });
    }
  };

  const loadViolations = async () => {
    try {
      const params = mode === 'day' ? { date } : { week: getWeekNumber(date) };
      const res = await api.get('/class-lineup-summaries', { params });
      setViolations(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadWeeklyScores = async () => {
    try {
      const res = await api.get('/class-lineup-summaries/weekly-summary', {
        params: { week: getWeekNumber(date), year: new Date(date).getFullYear() },
      });
      setWeeklyScores(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadViolations();
    loadWeeklyScores();
  }, [date, mode]);

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận vi phạm xếp hàng
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} mb={2}>
          <TextField select label="Lớp" value={className} onChange={(e) => setClassName(e.target.value)} fullWidth>
            {classOptions.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Lỗi vi phạm" value={violation} onChange={(e) => setViolation(e.target.value)} fullWidth>
            {violationOptions.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Người ghi nhận" value={recorder} onChange={(e) => setRecorder(e.target.value)} fullWidth>
            {recorderOptions.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction="row" spacing={2} mb={2}>
          <TextField label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          <TextField label="Ngày" type="date" value={date} onChange={(e) => setDate(e.target.value)} sx={{ width: 200 }} />
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Ghi nhận
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography>Xem theo:</Typography>
        <Select value={mode} onChange={(e) => setMode(e.target.value as 'day' | 'week')} sx={{ width: 150 }}>
          <MenuItem value="day">Ngày</MenuItem>
          <MenuItem value="week">Tuần</MenuItem>
        </Select>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          Danh sách vi phạm ({mode === 'day' ? date.split('-').reverse().join('/') : `Tuần ${getWeekNumber(date)}`})
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ngày</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Người ghi nhận</TableCell>
              <TableCell>Ghi chú</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v) => (
              <TableRow key={v._id}>
                <TableCell>{formatDate(v.date)}</TableCell>
                <TableCell>{v.className}</TableCell>
                <TableCell>{v.violation}</TableCell>
                <TableCell>{v.recorder}</TableCell>
                <TableCell>{v.note}</TableCell>
                <TableCell>
                  <Button color="error" onClick={() => handleDelete(v._id)}>
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {violations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Tổng điểm xếp hàng trong tuần {getWeekNumber(date)}
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell align="right">Tổng điểm</TableCell>
              <TableCell align="right">Số lần vi phạm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyScores.map((c) => (
              <TableRow key={c._id}>
                <TableCell>{c.className}</TableCell>
                <TableCell align="right">{c.lineUpScore}</TableCell>
                <TableCell align="right">{c.violationCount}</TableCell>
              </TableRow>
            ))}
            {weeklyScores.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Chưa có dữ liệu tuần này
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.type}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
