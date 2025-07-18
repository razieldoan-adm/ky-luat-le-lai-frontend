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
  Paper
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

interface Violation {
  _id: string;
  description: string;
  time: string;
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

  useEffect(() => {
    fetchViolations();
    fetchRules();
    fetchSettings();
  }, [name, className]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data?.maxConductScore) {
        setMaxConductScore(res.data.maxConductScore);
      }
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await axios.get(
        `/api/violations/${encodeURIComponent(name || '')}?className=${encodeURIComponent(className)}`
      );
      setViolations(res.data);
    } catch (err) {
      console.error('Error fetching violations:', err);
      setViolations([]);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await axios.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  const getHandlingMethodByRepeatCount = (count: number) => {
    const methods = ["Nhắc nhở", "Kiểm điểm", "Chép phạt", "Báo phụ huynh", "Mời phụ huynh", "Tạm dừng việc học tập"];
    return methods[count] || "Tạm dừng việc học tập";
  };

  const handleAddViolation = async () => {
    const selectedRule = rules.find((r) => r._id === selectedRuleId);
    if (!selectedRule || !name || !className) return;

    try {
      // Lấy danh sách tuần học
      const weeksRes = await axios.get('/api/academic-weeks/study-weeks');
      const weeks = weeksRes.data;
      const now = new Date();

      // Xác định tuần hiện tại
      const currentWeek = weeks.find((w: any) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return now >= start && now <= end;
      });

      const weekNumber = currentWeek ? currentWeek.weekNumber : null;

      // Lấy số lần vi phạm để tự động gán handlingMethod
      const res = await axios.get(
        `/api/violations/${encodeURIComponent(name)}?className=${encodeURIComponent(className)}`
      );
      const sameViolations = res.data.filter(
        (v: Violation) => v.description === selectedRule.title
      );
      const repeatCount = sameViolations.length;
      const autoHandlingMethod = getHandlingMethodByRepeatCount(repeatCount);

      // Ghi nhận vi phạm mới
      await axios.post('/api/violations', {
        name,
        className,
        description: selectedRule.title,
        handlingMethod: autoHandlingMethod,
        weekNumber: weekNumber,
        time: new Date(), // LUÔN CÓ time để backend không lỗi
        handled: false // mặc định chưa xử lý
      });

      setSelectedRuleId('');
      setSnackbarMessage(`Đã ghi nhận lỗi: ${selectedRule.title} (Tuần: ${weekNumber ?? 'Không xác định'})`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchViolations();
    } catch (err) {
      console.error('Lỗi khi ghi nhận vi phạm:', err);
      setSnackbarMessage('Lỗi khi ghi nhận vi phạm.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  const handleMarkAsHandled = async (id: string) => {
  try {
    await axios.patch(`/api/violations/${id}/handle`);
    setSnackbarMessage('Đã xử lý vi phạm thành công!');
    setSnackbarSeverity('success');
    fetchViolations(); // refresh list
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
      await axios.delete(`/api/violations/${id}`);
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
                  <TableCell>{new Date(v.time).toLocaleString()}</TableCell>
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
