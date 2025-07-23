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
  Stack
} from '@mui/material';
import api from "../api/api";
import dayjs from 'dayjs';

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ViewViolationStudentByClassPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [repeatStudents, setRepeatStudents] = useState<{ name: string; count: number; className: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | ''>('');
  const [classList, setClassList] = useState<string[]>([]);
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [totalPoint, setTotalPoint] = useState(0);

  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchRules();
    fetchWeeks();
  }, []);

  const fetchViolations = async () => {
    try {
      const res = await api.get('/api/violations/all/all-student');
      setViolations(res.data);
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

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần:', err);
    }
  };

  const applyFilters = () => {
    if (!selectedClass || selectedWeek === '') {
      alert('Vui lòng chọn đầy đủ lớp và tuần');
      return;
    }

    const data = violations.filter(
      (v) =>
        v.className.trim().toLowerCase() === selectedClass.trim().toLowerCase() &&
        v.weekNumber === selectedWeek
    );
    setFiltered(data);

    const total = data.reduce((sum, v) => {
      const rule = rules.find((r) => r.title === v.description);
      return sum + (rule?.point || 0);
    }, 0);

    setTotalPoint(total);

    // ✅ Tìm học sinh vi phạm từ 3 lần trở lên
    const countMap: { [key: string]: { count: number; className: string } } = {};
    data.forEach((v) => {
      if (!countMap[v.name]) {
        countMap[v.name] = { count: 1, className: v.className };
      } else {
        countMap[v.name].count += 1;
      }
    });

    const repeated = Object.entries(countMap)
      .filter(([_, val]) => val.count >= 3)
      .map(([name, val]) => ({
        name,
        count: val.count,
        className: val.className,
      }));

    setRepeatStudents(repeated);
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        Danh sách vi phạm học sinh theo lớp
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
        <TextField
          label="Chọn lớp"
          select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">-- Chọn lớp --</MenuItem>
          {classList.map((cls) => (
            <MenuItem key={cls} value={cls}>{cls}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Chọn tuần"
          select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
      </Stack>

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Tổng điểm bị trừ: {totalPoint}
      </Typography>

      {/* ✅ Bảng danh sách vi phạm chi tiết */}
      <Paper elevation={3} sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Thời gian</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{rules.find((r) => r.title === v.description)?.point || 0}</TableCell>
                  <TableCell>{v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">Không có dữ liệu.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ✅ Bảng học sinh vi phạm nhiều lần */}
      <Typography variant="h6" sx={{ color: 'red', mb: 1 }}>
        Danh sách học sinh vi phạm từ 3 lần trở lên trong tuần
      </Typography>

      <Paper elevation={3} sx={{ width: '100%', overflowX: 'auto', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#ffcccc' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Số lần vi phạm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repeatStudents.length > 0 ? (
              repeatStudents.map((s, i) => (
                <TableRow key={s.name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">Không có học sinh vi phạm từ 3 lần.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
