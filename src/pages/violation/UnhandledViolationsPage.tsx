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
  FormControlLabel,
  Checkbox,
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
  week?: number;
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
  const [searchName, setSearchName] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [weekList, setWeekList] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [onlyFrequent, setOnlyFrequent] = useState(false);

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

      // Lấy danh sách tuần
      const weeks = Array.from(new Set(res.data.map((v: Violation) => v.week).filter(Boolean))) as number[];
      setWeekList(weeks.sort((a, b) => a - b));
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

    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }

    if (selectedWeek !== 'all') {
      data = data.filter((v) => v.week === selectedWeek);
    }

    if (searchName) {
      const search = searchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      data = data.filter((v) =>
        v.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(search)
      );
    }

    if (onlyFrequent) {
      const countMap: { [key: string]: number } = {};
      data.forEach((v) => {
        const key = `${v.name}-${v.className}`;
        countMap[key] = (countMap[key] || 0) + 1;
      });
      data = data.filter((v) => countMap[`${v.name}-${v.className}`] >= 3);
    }

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
              setSelectedClasses(
                typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
              )
            }
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

          {/* Chọn tuần */}
          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) =>
              setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Tất cả tuần</MenuItem>
            {weekList.map((w) => (
              <MenuItem key={w} value={w}>
                Tuần {w}
              </MenuItem>
            ))}
          </TextField>

          {/* Checkbox chỉ hiển thị HS >= 3 vi phạm */}
          <FormControlLabel
            control={
              <Checkbox
                checked={onlyFrequent}
                onChange={(e) => setOnlyFrequent(e.target.checked)}
              />
            }
            label="Chỉ học sinh >= 3 lần vi phạm"
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
              <TableCell>Tuần</TableCell>
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
                  <TableCell>{v.week || '-'}</TableCell>
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
                <TableCell colSpan={8} align="center">
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
