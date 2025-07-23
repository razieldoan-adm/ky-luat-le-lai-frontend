import { useState, useEffect } from 'react';
import api from "../api/api";
import {
  Box, Typography, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Stack
} from '@mui/material';

export default function ViewFullClassSummary() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [hygiene, setHygiene] = useState<any>({});
  const [attendance, setAttendance] = useState<any>({});
  const [lineup, setLineup] = useState<any>({});
  const [lineupNotes, setLineupNotes] = useState<string[]>([]);

  const lineupRuleList = [
    'Xếp hàng chậm',
    'Nhiều hs ngồi trong lớp giờ chơi, không ra xếp hàng',
    'Mở đèn quạt giờ chơi',
    'Vệ sinh chỗ xếp hàng không sạch',
    'Mất trật tự trong khi xếp hàng giờ SHDC',
    'Ồn ào, đùa giỡn khi di chuyển lên lớp'
  ];

  useEffect(() => {
    fetchWeeks();
    fetchClasses(); // Thay bằng API classes nếu có
  }, []);
  
  const fetchWeeks = async () => {
    const res = await api.get('/api/academic-weeks/study-weeks');
    setWeeks(res.data);
    setSelectedWeek(res.data[0]);
  };
  const fetchClasses = async () => {
  try {
    const res = await api.get('/api/classes'); // endpoint thực tế của bạn
    const validClasses = res.data
      .filter((cls: any) => cls.teacher) // nếu bạn chỉ muốn lớp có giáo viên
      .map((cls: any) => cls.className);

    setClasses(validClasses);
    if (validClasses.length > 0) setSelectedClass(validClasses[0]);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách lớp:', err);
  }
};
  const fetchData = async () => {
    if (!selectedWeek || !selectedClass) return;
    setLoading(true);
    const weekNumber = selectedWeek.weekNumber;

    try {
      const [hRes, aRes, lRes] = await Promise.all([
        api.get('/api/class-hygiene-scores/by-week-and-class', { params: { weekNumber, className: selectedClass } }),
        api.get('/api/class-attendance-summaries/by-week-and-class', { params: { weekNumber, className: selectedClass } }),
        api.get('/api/class-lineup-summaries/by-week-and-class', { params: { weekNumber, className: selectedClass } }),
      ]);

      setHygiene(hRes.data[0] || {});
      setAttendance(aRes.data[0] || {});
      setLineup(lRes.data[0] || {});

      const notes: string[] = [];

      // ✅ Nếu API trả về notes (ghi chú chi tiết)
      if (lRes.data[0]?.notes && Array.isArray(lRes.data[0].notes)) {
        lRes.data[0].notes.forEach((note: any, idx: number) => {
          notes.push(`${idx + 1}. ${note}`);
        });
      }

      // ✅ Nếu không có notes nhưng có data chứa chỉ số lỗi
      else if (lRes.data[0]?.data && Array.isArray(lRes.data[0].data)) {
        lRes.data[0].data.forEach((violationIndex: number, idx: number) => {
          if (violationIndex > 0 && violationIndex <= lineupRuleList.length) {
            notes.push(`${idx + 1}. ${lineupRuleList[violationIndex - 1]}`);
          }
        });
      }

      setLineupNotes(notes);

    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedWeek && selectedClass) fetchData();
  }, [selectedWeek, selectedClass]);

  const renderTable = (title: string, data: any, type: 'hygiene' | 'attendance' | 'lineup') => (
    <Box my={2}>
      <Typography variant="h6">{title}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center">Ngày</TableCell>
            {Array.from({ length: 10 }).map((_, idx) => (
              <TableCell key={idx} align="center">T{idx + 1}</TableCell>
            ))}
            <TableCell align="center">Tổng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell align="center">Điểm / Lỗi</TableCell>
            {(data.data || Array(10).fill(0)).map((d: number, idx: number) => (
              <TableCell key={idx} align="center">{d}</TableCell>
            ))}
            <TableCell align="center">{data.total || 0}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {type === 'hygiene' && (data.total || 0) === 0 && (
        <Typography mt={1} color="green">✅ Không có lỗi vệ sinh tuần này</Typography>
      )}

      {type === 'attendance' && (data.total || 0) === 0 && (
        <Typography mt={1} color="green">✅ Không có lỗi chuyên cần tuần này</Typography>
      )}

      {type === 'lineup' && lineupNotes.length > 0 && (
        <Box mt={1}>
          <Typography fontWeight="bold">📌 Chi tiết lỗi xếp hàng:</Typography>
          {lineupNotes.map((n, idx) => (
            <Typography key={idx} sx={{ ml: 2 }}>{n}</Typography>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>📊 Xem điểm Vệ sinh - Chuyên cần - Xếp hàng</Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Tuần</InputLabel>
          <Select
            value={selectedWeek?._id || ''}
            label="Tuần"
            onChange={(e) => setSelectedWeek(weeks.find(w => w._id === e.target.value))}
          >
            {weeks.map(w => (
              <MenuItem key={w._id} value={w._id}>Tuần {w.weekNumber}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Lớp</InputLabel>
          <Select
            value={selectedClass}
            label="Lớp"
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? <CircularProgress /> : (
        <>
          {renderTable('🧹 Vệ sinh', hygiene, 'hygiene')}
          {renderTable('👥 Chuyên cần', attendance, 'attendance')}
          {renderTable('✏️ Xếp hàng', lineup, 'lineup')}
        </>
      )}
    </Box>
  );
}
