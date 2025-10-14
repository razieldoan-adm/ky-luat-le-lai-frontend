// src/pages/violation/UnhandledViolationsPage.tsx
import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, MenuItem, Checkbox, FormControlLabel, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Paper, Stack, ListItemText
} from '@mui/material';
import api from '../../api/api';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// ✅ Kích hoạt plugin timezone + đặt múi giờ mặc định
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date | string;
  handlingMethod: string;
  handled?: boolean; // ✅ thêm dòng này
  handledBy?: string; // ✅ thêm
}
interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}
interface Week {
  _id?: string;
  weekNumber?: number;
  start?: string;
  end?: string;
  label?: string;
}

export default function UnhandledViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [searchName, setSearchName] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | number | ''>('all');
  const [onlyFrequent, setOnlyFrequent] = useState(false);
  const [weekList, setWeekList] = useState<Week[]>([]);

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

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần:', err);
    }
  };

  const applyFilters = () => {
    let data = [...violations];
    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }

    // ✅ Lọc theo tuần
    if (selectedWeek !== 'all' && selectedWeek !== '') {
      const week = weekList.find(
        (w) =>
          (w.weekNumber !== undefined && String(w.weekNumber) === String(selectedWeek)) ||
          w.label === selectedWeek
      );
      if (week) {
        const start = (week.start ?? (week as any).startDate) || '';
        const end = (week.end ?? (week as any).endDate) || '';
        if (start && end) {
          data = data.filter(
            (v) =>
              dayjs(v.time).isAfter(dayjs(start).subtract(1, 'day')) &&
              dayjs(v.time).isBefore(dayjs(end).add(1, 'day'))
          );
        }
      }
    }

    if (searchName) {
      const keyword = searchName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      data = data.filter((v) => {
        const studentName = (v.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return studentName.includes(keyword);
      });
    }

    if (onlyFrequent) {
      const countMap: { [key: string]: number } = {};
      data.forEach((v) => {
        const normalized = v.name.trim().toLowerCase();
        countMap[normalized] = (countMap[normalized] || 0) + 1;
      });
      data = data.filter((v) => countMap[v.name.trim().toLowerCase()] >= 3);
    }

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

  // ✅ Hàm xử lý: GVCN / PGT
  const handleMarkAsHandled = async (id: string, role: 'GVCN' | 'PGT') => {
    try {
      await api.put(`/api/violations/${id}`, {
        handled: true,
        handledBy: role,
      });
      fetchViolations(); // refresh sau khi cập nhật
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Học sinh vi phạm (báo cáo)
      </Typography>

      <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, mt: 2, p: 2, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Chọn lớp"
            select
            SelectProps={{
              multiple: true,
              renderValue: (selected: any) => {
                if (!selected || (Array.isArray(selected) && selected.length === 0)) return 'Tất cả lớp';
                return Array.isArray(selected) ? selected.join(', ') : String(selected);
              },
            }}
            value={selectedClasses}
            onChange={(e) =>
              setSelectedClasses(typeof e.target.value === 'string'
                ? e.target.value.split(',')
                : (e.target.value as string[]))
            }
            sx={{ minWidth: 200 }}
          >
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                <Checkbox checked={selectedClasses.indexOf(cls) > -1} />
                <ListItemText primary={cls} />
              </MenuItem>
            ))}
          </TextField>

          {/* ✅ Chọn tuần */}
          <TextField
            label="Chọn tuần"
            select
            value={selectedWeek}
            onChange={(e) => {
              const v = e.target.value as string;
              if (v === 'all') return setSelectedWeek('all');
              if (v === '') return setSelectedWeek('');
              setSelectedWeek(isNaN(Number(v)) ? v : Number(v));
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Tất cả tuần</MenuItem>
            {weekList.map((w) => {
              const start = (w.start ?? (w as any).startDate) || '';
              const end = (w.end ?? (w as any).endDate) || '';
              const label = w.weekNumber !== undefined ? `Tuần ${w.weekNumber}` : w.label ?? 'Tuần';
              const range = start && end ? ` (${dayjs(start).format('DD/MM')} - ${dayjs(end).format('DD/MM')})` : '';
              const value = w.weekNumber !== undefined ? w.weekNumber : (w.label ?? '');
              return (
                <MenuItem key={String(value)} value={value}>
                  {label + range}
                </MenuItem>
              );
            })}
          </TextField>

          <TextField
            label="Tìm theo tên học sinh"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <FormControlLabel
            control={<Checkbox checked={onlyFrequent} onChange={(e) => setOnlyFrequent(e.target.checked)} />}
            label="Chỉ học sinh >= 3 vi phạm"
          />

          <Button variant="contained" onClick={applyFilters}>Áp dụng</Button>
          <Button variant="outlined" onClick={clearFilters}>Xóa lọc</Button>
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
    <TableCell>Trạng thái</TableCell>
    <TableCell>Người xử lý</TableCell> {/* ✅ Thêm cột */}
    <TableCell>Điểm</TableCell>
    <TableCell align="center">Thao tác</TableCell>
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
        <TableCell>{v.handlingMethod || '-'}</TableCell> {/* ✅ Giữ nguyên */}
        <TableCell>{v.handled ? 'Đã xử lý' : 'Chưa xử lý'}</TableCell> {/* ✅ trạng thái */}
        <TableCell>{v.handledBy || '-'}</TableCell> {/* ✅ đúng người xử lý */}
        <TableCell>{rules.find((r) => r.title === v.description)?.point || 0}</TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button size="small" variant="contained" color="primary"
              onClick={() => handleMarkAsHandled(v._id, 'GVCN')}>
              GVCN
            </Button>
            <Button size="small" variant="contained" color="secondary"
              onClick={() => handleMarkAsHandled(v._id, 'PGT')}>
              PGT
            </Button>
          </Stack>
        </TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan={10} align="center">
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
