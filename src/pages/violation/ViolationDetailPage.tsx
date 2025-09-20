import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';

interface Violation {
  _id: string;
  description: string;
  time: any; // could be ISO string or Date object or dd/MM/yyyy string
  handled: boolean;
  handlingMethod: string;
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

const ViolationDetailPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const className = new URLSearchParams(location.search).get('className') || '';

  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [maxConductScore, setMaxConductScore] = useState(100);
  const [currentWeek, setCurrentWeek] = useState<any | null>(null);

  // nhập ngày/tháng (năm mặc định là năm hiện tại)
  const [dayInput, setDayInput] = useState('');
  const [monthInput, setMonthInput] = useState('');

  useEffect(() => {
    fetchViolations();
    fetchRules();
    fetchSettings();
    fetchWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, className]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.data?.maxConductScore) {
        setMaxConductScore(res.data.maxConductScore);
      }
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      const weeks = res.data || [];
      const now = new Date();

      const week = weeks.find((w: any) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return now >= start && now <= end;
      });

      setCurrentWeek(week || null);
    } catch (err) {
      console.error('Lỗi khi lấy tuần học:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get(
        `/api/violations/${encodeURIComponent(name || '')}?className=${encodeURIComponent(className)}`
      );
      setViolations(res.data || []);
    } catch (err) {
      console.error('Error fetching violations:', err);
      setViolations([]);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
      setRules(res.data || []);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  const getHandlingMethodByRepeatCount = (count: number) => {
    const methods = ["Nhắc nhở", "Kiểm điểm", "Chép phạt", "Báo phụ huynh", "Mời phụ huynh", "Tạm dừng việc học tập"];
    return methods[count] || "Tạm dừng việc học tập";
  };

  // --- Hàm lấy ngày vi phạm (ưu tiên ngày nhập, fallback ngày hệ thống)
  // Trả về Date object
  const getViolationDate = (): Date => {
    const now = new Date();
    const year = now.getFullYear();

    if (dayInput && monthInput) {
      const dd = parseInt(dayInput, 10);
      const mm = parseInt(monthInput, 10) - 1; // JS tháng từ 0
      if (!isNaN(dd) && !isNaN(mm) && dd > 0 && dd <= 31 && mm >= 0 && mm < 12) {
        // Tạo dạng yyyy-mm-dd để tránh ảo tuỳ locale
        const candidate = new Date(year, mm, dd);
        if (!isNaN(candidate.getTime())) {
          return candidate;
        }
      }
    }

    return now;
  };

  // --- Format Date -> dd/MM/yyyy
  const formatDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // --- Robust formatter for displaying whatever v.time is
  const formatTimeForDisplay = (t: any) => {
    if (!t && t !== 0) return '';
    // If it's a Date object
    if (t instanceof Date) return formatDate(t);
    // If it's a string, try ISO or dd/mm/yyyy
    if (typeof t === 'string') {
      // Try ISO parse first
      const dIso = new Date(t);
      if (!isNaN(dIso.getTime())) return formatDate(dIso);

      // Try dd/mm/yyyy or d/m/yyyy
      const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const dd = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10) - 1;
        const yyyy = parseInt(m[3], 10);
        const d = new Date(yyyy, mm, dd);
        if (!isNaN(d.getTime())) return formatDate(d);
      }

      // fallback: return raw
      return t;
    }

    // other types: try convert to Date
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return formatDate(d);
    } catch {}
    return String(t);
  };

  const handleAddViolation = async () => {
    const selectedRule = rules.find((r) => r._id === selectedRuleId);
    if (!selectedRule || !name || !className) {
      setSnackbarMessage('Vui lòng chọn lỗi và đảm bảo có thông tin học sinh/lớp.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      // lấy tuần hiện tại (như trước)
      const weeksRes = await api.get('/api/academic-weeks/study-weeks');
      const weeks = weeksRes.data || [];
      const now = new Date();

      const currentWeek = weeks.find((w: any) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return now >= start && now <= end;
      });

      const weekNumber = currentWeek ? currentWeek.weekNumber : null;

      // lấy các vi phạm hiện có để tính lặp
      const res = await api.get(
        `/api/violations/${encodeURIComponent(name)}?className=${encodeURIComponent(className)}`
      );
      const sameViolations = (res.data || []).filter(
        (v: Violation) => v.description === selectedRule.title
      );
      const repeatCount = sameViolations.length;
      const autoHandlingMethod = getHandlingMethodByRepeatCount(repeatCount);

      // prepare time: use ISO string to send to backend (backend thường lưu Date)
      const violationDateObj = getViolationDate();
      const violationTimeToSend = violationDateObj.toISOString();

      await api.post('/api/violations', {
        name,
        className,
        description: selectedRule.title,
        handlingMethod: autoHandlingMethod,
        weekNumber: weekNumber,
        time: violationTimeToSend,
        handled: false,
      });

      // reset inputs
      setSelectedRuleId('');
      setDayInput('');
      setMonthInput('');

      setSnackbarMessage(`Đã ghi nhận lỗi: ${selectedRule.title} (Tuần: ${weekNumber ?? 'Không xác định'})`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      await fetchViolations();
    } catch (err) {
      console.error('Lỗi khi ghi nhận vi phạm:', err);
      setSnackbarMessage('Lỗi khi ghi nhận vi phạm.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleMarkAsHandled = async (id: string) => {
    try {
      await api.patch(`/api/violations/${id}/handle`);
      setSnackbarMessage('Đã xử lý vi phạm thành công!');
      setSnackbarSeverity('success');
      await fetchViolations();
    } catch (err) {
      console.error('Lỗi khi xử lý vi phạm:', err);
      setSnackbarMessage('Lỗi khi xử lý vi phạm.');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleDeleteViolation = async (id: string) => {
    try {
      await api.delete(`/api/violations/${id}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
      setSnackbarMessage('Xoá vi phạm thành công!');
      setSnackbarSeverity('success');
    } catch (err) {
      console.error('Lỗi xoá vi phạm:', err);
      setSnackbarMessage('Lỗi xoá vi phạm.');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };

  // compute points & final score (unchanged)
  const totalPenalty = violations.reduce((sum, v) => {
    const rule = rules.find((r) => r.title === v.description);
    return sum + (rule?.point || 0);
  }, 0);

  const finalScore = Math.max(maxConductScore - totalPenalty, 0);
  const isBelowThreshold = finalScore < maxConductScore * 0.5;

  return (
    <Box sx={{ width: '80vw', py: 6, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" align="center">
        Chi tiết vi phạm
      </Typography>
      <Typography variant="h6">
        Học sinh: {name} - Lớp: {className}
      </Typography>
      <Typography color={isBelowThreshold ? 'error' : 'green'}>
        Điểm hạnh kiểm: {finalScore}/{maxConductScore}
      </Typography>

      {currentWeek && (
        <Typography sx={{ mt: 1 }}>
          Tuần hiện tại: Tuần {currentWeek.weekNumber} (
          {new Date(currentWeek.startDate).toLocaleDateString()} -{' '}
          {new Date(currentWeek.endDate).toLocaleDateString()})
        </Typography>
      )}

      <Card sx={{ my: 3 }}>
        <CardContent>
          <Typography variant="h6">Ghi nhận lỗi mới</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Lỗi vi phạm</InputLabel>
              <Select
                value={selectedRuleId}
                label="Lỗi vi phạm"
                onChange={(e) => setSelectedRuleId(e.target.value)}
              >
                {rules.map((rule) => (
                  <MenuItem key={rule._id} value={rule._id}>
                    {rule.title} ({rule.point} điểm)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* ô nhập ngày/tháng (năm mặc định là năm hiện tại) */}
            <TextField
              label="Ngày (dd)"
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
              inputProps={{ maxLength: 2 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="Tháng (MM)"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
              inputProps={{ maxLength: 2 }}
              sx={{ width: 100 }}
            />

            <Button variant="contained" onClick={handleAddViolation}>
              Ghi nhận
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{formatTimeForDisplay(v.time)}</TableCell>
                  <TableCell>{v.handlingMethod}</TableCell>
                  <TableCell>
                    {v.handled ? (
                      <Box sx={{ backgroundColor: 'green', color: 'white', px: 1, py: 0.5, borderRadius: 1, textAlign: 'center' }}>
                        Đã xử lý
                      </Box>
                    ) : (
                      <Box sx={{ backgroundColor: '#ffcccc', color: 'red', px: 1, py: 0.5, borderRadius: 1, textAlign: 'center' }}>
                        Chưa xử lý
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{v.weekNumber ?? 'N/A'}</TableCell>
                  <TableCell>
                    {!v.handled && (
                      <Button size="small" variant="contained" onClick={() => handleMarkAsHandled(v._id)}>
                        XỬ LÝ
                      </Button>
                    )}
                    <Button size="small" color="error" onClick={() => handleDeleteViolation(v._id)}>
                      Xoá
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Button variant="outlined" sx={{ mt: 3 }} onClick={() => navigate('/')}>
        Quay lại
      </Button>
    </Box>
  );
};

export default ViolationDetailPage;
