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
  Alert,
} from '@mui/material';
import api from '../../api/api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  penalty: number;
  handlingMethod: string;
  handled?: boolean;
  handledBy?: string;
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning',
  });

  // ⚙️ Giới hạn
  const [limitGVCNHandling, setLimitGVCNHandling] = useState(false);
  const [settings, setSettings] = useState({
    limitGVCNHandling: 1,
    classViolationLimit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 🔹 trạng thái "Điều chỉnh"

  // ✅ Lấy trạng thái hiện tại từ backend
  const fetchSetting = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.data) {
        setLimitGVCNHandling(!!res.data.limitGVCNHandlingEnabled); // ⚠️ ép kiểu boolean
        setSettings({
          limitGVCNHandling: Number(res.data.limitGVCNHandling ?? 1),
          classViolationLimit: Number(res.data.classViolationLimit ?? 10),
        });
      }
    } catch (err) {
      console.error('Lỗi khi lấy setting:', err);
    }
  };

  // ✅ Khi bật/tắt giới hạn GVCN
  const handleToggle = async () => {
    const newValue = !limitGVCNHandling;
    setLimitGVCNHandling(newValue);
    setLoading(true);
    try {
      await api.put('/api/settings/update', { limitGVCNHandling: newValue });
      setSnackbar({
        open: true,
        message: 'Đã cập nhật trạng thái giới hạn GVCN',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật setting:', err);
      setLimitGVCNHandling(!newValue);
      setSnackbar({
        open: true,
        message: 'Lỗi cập nhật giới hạn',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cập nhật giới hạn tuần & lớp
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await api.put('/api/settings/update', settings);
      setSnackbar({
        open: true,
        message: 'Đã lưu cấu hình giới hạn thành công!',
        severity: 'success',
      });
      setIsEditing(false); // 🔒 khóa lại sau khi lưu
    } catch (err) {
      console.error('Lỗi khi lưu settings:', err);
      setSnackbar({
        open: true,
        message: 'Lỗi khi lưu cấu hình!',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Khởi tạo dữ liệu
  useEffect(() => {
    const init = async () => {
      await fetchSetting();
      await fetchWeeks();
      await fetchClasses();
      await fetchRules();
      await fetchViolations();
    };
    init();
  }, []);

  const fetchWeeks = async () => {
    try {
      const [weeksRes, currentRes] = await Promise.all([
        api.get('/api/academic-weeks/study-weeks'),
        api.get('/api/academic-weeks/current'),
      ]);
      const weekList: Week[] = weeksRes.data;
      setWeeks(weekList);
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
      const data: Violation[] = res.data;
      setViolations(data);
      setFiltered(data);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu vi phạm:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const validClasses: string[] = res.data
        .filter((cls: any) => cls.teacher)
        .map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách lớp:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
      const data: Rule[] = res.data;
      setRules(data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  const applyFilters = () => {
    let data: Violation[] = [...violations];
    if (selectedClass) data = data.filter((v: Violation) => v.className === selectedClass);
    if (selectedWeek) data = data.filter((v: Violation) => String(v.weekNumber) === selectedWeek);
    if (handledStatus) {
      if (handledStatus === 'unhandled') {
        data = data.filter((v) => !v.handled);
      } else {
        data = data.filter((v) => v.handledBy === handledStatus);
      }
    }
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
  }, [selectedWeek, selectedClass, handledStatus, violations]);

  const handleDeleteViolation = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá vi phạm này không?')) return;
    try {
      await api.delete(`/api/violations/${id}`);
      await fetchViolations();
    } catch (error) {
      console.error('Lỗi khi xoá vi phạm:', error);
    }
  };

  const handleProcessViolation = async (id: string, handledBy: string) => {
    try {
      const res = await api.patch(`/api/violations/${id}/handle`, { handledBy });
      setViolations((prev) => prev.map((v) => (v._id === id ? res.data : v)));
    } catch (err) {
      console.error('Lỗi khi cập nhật người xử lý:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!violationBeingEdited) return;
    try {
      await api.put(`/api/violations/${violationBeingEdited._id}`, violationBeingEdited);
      setSnackbar({ open: true, message: 'Cập nhật thành công', severity: 'success' });
      setEditDialogOpen(false);
      await fetchViolations();
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

      {/* ⚙️ Giới hạn xử lý */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }} elevation={3}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            color={limitGVCNHandling ? 'success' : 'error'}
            onClick={handleToggle}
            disabled={loading}
            sx={{ borderRadius: '50px' }}
          >
            {limitGVCNHandling ? '🟢 GIỚI HẠN GVCN: BẬT' : '🔴 GIỚI HẠN GVCN: TẮT'}
          </Button>

          <TextField
            label="Số lần GVCN xử lý/HS/tuần"
            type="number"
            size="small"
            sx={{ width: 200 }}
            value={settings.limitGVCNHandling}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                limitGVCNHandling: Number(e.target.value),
              }))
            }
            disabled={!isEditing || loading}
          />

          <TextField
            label="Tổng lượt GVCN xử lý/lớp/tuần"
            type="number"
            size="small"
            sx={{ width: 230 }}
            value={settings.classViolationLimit}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                classViolationLimit: Number(e.target.value),
              }))
            }
            disabled={!isEditing || loading}
          />

          {isEditing ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setIsEditing(true)}
            >
              Điều chỉnh
            </Button>
          )}
        </Stack>
      </Paper>

      {/* (phần còn lại giữ nguyên – bảng, bộ lọc, dialog, snackbar) */}
      {/* ... */}


      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Sửa lỗi vi phạm</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Lỗi vi phạm"
              fullWidth
              value={violationBeingEdited?.description || ''}
              onChange={(e) =>
                setViolationBeingEdited((prev) =>
                  prev ? { ...prev, description: e.target.value } : prev
                )
              }
            />
            <TextField
              label="Hình thức xử lý"
              fullWidth
              value={violationBeingEdited?.handlingMethod || ''}
              onChange={(e) =>
                setViolationBeingEdited((prev) =>
                  prev ? { ...prev, handlingMethod: e.target.value } : prev
                )
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
