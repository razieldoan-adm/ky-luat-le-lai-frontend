import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Stack,
} from '@mui/material';
import api from '../../api/api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  handlingMethod: string;
}
interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}
interface Week {
  label: string;
  start: string;
  end: string;
}

export default function UnhandledViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [searchName, setSearchName] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [onlyFrequent, setOnlyFrequent] = useState(false);

  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchRules();
    fetchWeeks(); // lấy tuần từ API
  }, []);

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
      const validClasses = res.data
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
      setRules(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  // lấy tuần từ API setting
  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeeks([{ label: 'Tất cả tuần', start: '', end: '' }, ...res.data]);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần:', err);
    }
  };

  const applyFilters = () => {
    let data = [...violations];

    // Lọc theo lớp
    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }

    // Lọc theo tuần
    if (selectedWeek !== 'all') {
      const week = weeks.find((w) => w.label === selectedWeek);
      if (week) {
        data = data.filter(
          (v) =>
            dayjs(v.time).isAfter(dayjs(week.start).subtract(1, 'day')) &&
            dayjs(v.time).isBefore(dayjs(week.end).add(1, 'day'))
        );
      }
    }

    // Lọc theo tên
    if (searchName) {
      const keyword = searchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      data = data.filter((v) => {
        const studentName = v.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return studentName.includes(keyword);
      });
    }

    // Chỉ học sinh >= 3 vi phạm
    if (onlyFrequent) {
      const countMap: { [key: string]: number } = {};
      data.forEach((v) => {
        const normalized = v.name.trim().toLowerCase();
        countMap[normalized] = (countMap[normalized] || 0) + 1;
      });
      data = data.filter((v) => countMap[v.name.trim().toLowerCase()] >= 3);
    }

    // Sắp xếp lớp nhỏ → lớn, sau đó theo tên
    data.sort((a, b) => {
      if (a.className === b.className) {
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
      }
      return a.className.localeCompare(b.className, 'vi', { numeric: true });
    });

    setFiltered(data);
  };

  const clearFilters = () => {
    setSelectedClasses([]);
    setSearchName('');
    setSelectedWeek('all');
    setOnlyFrequent(false);
    setFiltered(violations);
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Học sinh vi phạm (báo cáo)
      </Typography>

      <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2, p: 2, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          {/* Lọc nhiều lớp */}
          <TextField
            label="Chọn lớp"
            select
            SelectProps={{ multiple: true }}
            value={selectedClasses}
            onChange={(e) =>
              setSelectedClasses(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Tất cả lớp</MenuItem>
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          {/* Dropdown tuần */}
          <TextField
            label="Chọn tuần"
            select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {weeks.map((w) => (
              <MenuItem key={w.label} value={w.label}>
                {w.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Tìm theo tên */}
          <TextField
            label="Tìm theo tên học sinh"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          {/* Chỉ HS >= 3 vi phạm */}
          <FormControlLabel
            control={<Checkbox checked={onlyFrequent} onChange={(e) => setOnlyFrequent(e.target.checked)} />}
            label="Chỉ học sinh >= 3 vi phạm"
          />

          <Button variant="contained" onClick={applyFilters}>
            Áp dụng
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Xóa lọc
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Điểm</TableCell>
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
                  <TableCell>{v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}</TableCell>
                  <TableCell>{v.handlingMethod}</TableCell>
                  <TableCell>{rules.find((r) => r.title === v.description)?.point || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
