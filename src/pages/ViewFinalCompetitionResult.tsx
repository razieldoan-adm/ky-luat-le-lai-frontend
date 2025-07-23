import { useState, useEffect } from 'react';
import {
  Box, Typography, MenuItem, FormControl, Select,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress
} from '@mui/material';
import api from "../api/api";

export default function ViewFinalCompetitionResult() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) fetchResults();
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error('Lỗi khi lấy tuần:', err);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/class-weekly-scores', {
        params: { weekNumber: selectedWeek.weekNumber },
      });
      // Sắp xếp theo tên lớp thay vì theo tổng điểm
      const sorted = res.data.sort((a: any, b: any) => {
  const extractNumber = (s: string) => {
    const match = s.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  };
  const extractPrefix = (s: string) => s.replace(/\d+$/, '');

  const prefixA = extractPrefix(a.className);
  const prefixB = extractPrefix(b.className);

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB);
  }

  return extractNumber(a.className) - extractNumber(b.className);
});
      setResults(sorted);
    } catch (err) {
      console.error('Lỗi khi lấy kết quả thi đua:', err);
    }
    setLoading(false);
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        🏆 Kết quả thi đua toàn trường theo tuần
      </Typography>

      <FormControl sx={{ minWidth: 180, mb: 2 }}>
        <Select
          value={selectedWeek?._id || ''}
          onChange={(e) => setSelectedWeek(weeks.find(w => w._id === e.target.value))}
          displayEmpty
        >
          {weeks.map(w => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <CircularProgress />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">STT</TableCell>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">Điểm SĐB</TableCell>
              <TableCell align="center">Điểm kỷ luật</TableCell>
              <TableCell align="center">Điểm vệ sinh</TableCell>
              <TableCell align="center">Điểm chuyên cần</TableCell>
              <TableCell align="center">Điểm xếp hàng</TableCell>
              <TableCell align="center">Tổng</TableCell>
              <TableCell align="center">Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell align="center">{idx + 1}</TableCell>
                <TableCell align="center">{r.className}</TableCell>
                <TableCell align="center">{r.academicScore}</TableCell>
                <TableCell align="center">{r.disciplineScore}</TableCell>
                <TableCell align="center">{r.hygieneScore}</TableCell>
                <TableCell align="center">{r.attendanceScore}</TableCell>
                <TableCell align="center">{r.lineUpScore}</TableCell>
                <TableCell align="center">{r.totalScore}</TableCell>
                <TableCell align="center">{r.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
