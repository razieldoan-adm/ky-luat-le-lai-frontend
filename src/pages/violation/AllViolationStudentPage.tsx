import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import api from '../../api/api';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// ✅ Kích hoạt plugin timezone + đặt múi giờ mặc định
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");
console.log("Giờ hiện tại (VN):", dayjs().tz().format());
interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  handled: boolean;
  penalty: number;
  handlingMethod: string;
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function AllViolationStudentPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [handledStatus, setHandledStatus] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [violationBeingEdited, setViolationBeingEdited] = useState<Violation | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

useEffect(() => {
  const init = async () => {
    await fetchWeeks(); // đợi tuần được lấy về và setSelectedWeek()
    await fetchClasses();
    await fetchRules();
    await fetchViolations();
  };
  init();
}, []);


  // 🧭 Lấy danh sách tuần học + tuần hiện tại
  const fetchWeeks = async () => {
    try {
      const [weeksRes, currentRes] = await Promise.all([
        api.get('/api/academic-weeks/study-weeks'),
        api.get('/api/academic-weeks/current')
      ]);
      setWeeks(weeksRes.data);
      if (currentRes.data?.weekNumber) {
        setSelectedWeek(String(currentRes.data.weekNumber));
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần học:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get('/api/violations/all/all-student');
      setViolations(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu vi phạm:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const validClasses = res.data.filter((cls: any) => cls.teacher).map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách lớp:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  // 🔍 Lọc theo tuần và lớp
  const applyFilters = () => {
    let data = [...violations];
    if (selectedClass) data = data.filter((v) => v.className === selectedClass);
    if (selectedWeek) data = data.filter((v) => String(v.weekNumber) === selectedWeek);
    if (handledStatus) data = data.filter((v) => String(v.handled) === handledStatus);
    setFiltered(data);
  };
  

  const clearFilters = () => {
    setSelectedClass('');
    setSelectedWeek('');
    setHandledStatus('');
    setFiltered(violations);
  };

  useEffect(() => {
  applyFilters();
}, [selectedWeek,   violations]);

  // 🗑️ Xoá vi phạm
  const handleDeleteViolation = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá vi phạm này không?')) return;
    try {
      await api.delete(`/api/violations/${id}`);
      fetchViolations();
    } catch (error) {
      console.error('Lỗi khi xoá vi phạm:', error);
    }
  };

  // 🧾 Ghi nhận xử lý (GVCN hoặc PGT)
  const handleProcessViolation = async (id: string, method: string) => {
    try {
      await api.patch(`/api/violations/${id}/handle`, {
        handled: true,
        handlingMethod: method
      });
      setSnackbar({ open: true, message: `Đã ghi nhận xử lý: ${method}`, severity: 'success' });
      fetchViolations();
    } catch (error) {
      console.error('Lỗi khi xử lý vi phạm:', error);
      setSnackbar({ open: true, message: 'Lỗi khi xử lý vi phạm', severity: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    if (!violationBeingEdited) return;
    try {
      await api.put(`/api/violations/${violationBeingEdited._id}`, violationBeingEdited);
      setSnackbar({ open: true, message: 'Cập nhật thành công', severity: 'success' });
      setEditDialogOpen(false);
      fetchViolations();
    } catch (error) {
      console.error('Lỗi khi cập nhật vi phạm:', error);
      setSnackbar({ open: true, message: 'Lỗi cập nhật vi phạm', severity: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Danh sách tất cả học sinh vi phạm
      </Typography>

      {/* Bộ lọc */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Lọc theo lớp"
            select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">-- Tất cả lớp --</MenuItem>
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>{cls}</MenuItem>
            ))}
          </TextField>

          {/* ✅ Tuần học lấy từ API */}
          <TextField
            label="Tuần học"
            select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">-- Tất cả tuần --</MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format('DD/MM')} - {dayjs(w.endDate).format('DD/MM')})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tình trạng xử lý"
            select
            value={handledStatus}
            onChange={(e) => setHandledStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">-- Tất cả --</MenuItem>
            <MenuItem value="false">Chưa xử lý</MenuItem>
            <MenuItem value="true">Đã xử lý</MenuItem>
          </TextField>

          <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
          <Button variant="outlined" onClick={clearFilters}>Xóa lọc</Button>
        </Stack>
      </Paper>

      {/* Bảng dữ liệu */}
      <Paper elevation={3} sx={{ borderRadius: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Điểm</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.weekNumber || '-'}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}</TableCell>
                  <TableCell>{v.handlingMethod || '—'}</TableCell>
                  <TableCell>{v.handled ? 'Đã xử lý' : 'Chưa xử lý'}</TableCell>
                  <TableCell>{rules.find((r) => r.title === v.description)?.point || 0}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteViolation(v._id)}>Xoá</Button>
                      <Button variant="outlined" color="secondary" size="small" onClick={() => { setViolationBeingEdited(v); setEditDialogOpen(true); }}>Sửa</Button>

                      {!v.handled && (
                        <>
                          <Button variant="contained" color="primary" size="small"
                            onClick={() => handleProcessViolation(v._id, 'GVCN xử lý')}>
                            GVCN
                          </Button>
                          <Button variant="contained" color="success" size="small"
                            onClick={() => handleProcessViolation(v._id, 'PGT xử lý')}>
                            PGT
                          </Button>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} align="center">Không có dữ liệu phù hợp.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Hộp thoại sửa */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Sửa lỗi vi phạm</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Lỗi vi phạm"
              fullWidth
              value={violationBeingEdited?.description || ''}
              onChange={(e) =>
                setViolationBeingEdited(prev => prev ? { ...prev, description: e.target.value } : prev)
              }
            />
            <TextField
              label="Hình thức xử lý"
              fullWidth
              value={violationBeingEdited?.handlingMethod || ''}
              onChange={(e) =>
                setViolationBeingEdited(prev => prev ? { ...prev, handlingMethod: e.target.value } : prev)
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Lưu</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
