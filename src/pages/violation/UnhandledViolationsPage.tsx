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

export default function UnhandledViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchRules();
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

  const applyFilters = () => {
    let data = [...violations];

    // Lọc theo lớp (nếu có chọn)
    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }

    // Lọc theo tuần
    if (selectedWeek !== 'all') {
      const weekNum = parseInt(selectedWeek, 10);
      data = data.filter((v) => {
        const weekOfYear = dayjs(v.time).isoWeek();
        return weekOfYear === weekNum;
      });
    }

    setFiltered(data);
  };

  const clearFilters = () => {
    setSelectedClasses([]);
    setSelectedWeek('all');
    setFiltered(violations);
  };

  // Tạo danh sách tuần (1 → 52)
  const weekOptions = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Danh sách học sinh vi phạm (trên 3 lần)
      </Typography>

      <Paper
        sx={{
          width: '100%',
          overflowX: 'auto',
          borderRadius: 3,
          mt: 2,
          p: 2,
          mb: 4,
        }}
        elevation={3}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          {/* Chọn nhiều lớp */}
          <TextField
            label="Chọn lớp"
            select
            SelectProps={{ multiple: true }}
            value={selectedClasses}
            onChange={(e) => {
              const value =
                typeof e.target.value === 'string'
                  ? e.target.value.split(',')
                  : e.target.value;

              if (value.includes('all')) {
                setSelectedClasses([]); // chọn tất cả lớp
              } else {
                setSelectedClasses(value);
              }
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">-- Tất cả lớp --</MenuItem>
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          {/* Chọn tuần */}
          <TextField
            label="Chọn tuần"
            select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">-- Tất cả tuần --</MenuItem>
            {weekOptions.map((w) => (
              <MenuItem key={w} value={w.toString()}>
                Tuần {w}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={applyFilters}>
            Áp dụng
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Xóa lọc
          </Button>
        </Stack>
      </Paper>

      <Paper
        elevation={3}
        sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2 }}
      >
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
                  <TableCell>
                    {v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}
                  </TableCell>
                  <TableCell>{v.handlingMethod}</TableCell>
                  <TableCell>
                    {rules.find((r) => r.title === v.description)?.point || 0}
                  </TableCell>
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
