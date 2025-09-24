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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchName, setSearchName] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
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

  const applyFilters = () => {
    let data = [...violations];
    if (selectedClasses.length > 0) data = data.filter((v) => selectedClasses.includes(v.className));
    if (fromDate) data = data.filter((v) => dayjs(v.time).isAfter(dayjs(fromDate).subtract(1, 'day')));
    if (toDate) data = data.filter((v) => dayjs(v.time).isBefore(dayjs(toDate).add(1, 'day')));
    if (searchName) data = data.filter((v) => v.name.toLowerCase().includes(searchName.toLowerCase()));
    setFiltered(data);
  };

  const clearFilters = () => {
    setSelectedClasses([]);
    setFromDate('');
    setToDate('');
    setSearchName('');
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
            onChange={(e) => setSelectedClasses(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
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

          {/* Từ ngày - Đến ngày */}
          <TextField label="Từ ngày" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Đến ngày" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />

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
