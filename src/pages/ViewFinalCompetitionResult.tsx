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

      // Sắp xếp lớp cho gọn gàng
      const sorted = res.data.sort((a: any, b: any) => {
        const extractNumber = (s: string) => {
          const match = s.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const extractPrefix = (s: string) => s.replace(/\d+$/, '');
        const prefixA = extractPrefix(a.className);
        const prefixB = extractPrefix(b.className);

        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
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

      {/* Hiển thị tổng số lớp */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Tổng số lớp: {results.length}
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Table size="small" sx={{ border: "1px solid #000" }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>STT</TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>Lớp</TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>Học tập</TableCell>
              <TableCell align="center" colSpan={4} sx={{ border: "1px solid #000" }}>Nề nếp</TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>Tổng điểm Nề nếp</TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>Tổng</TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>Xếp hạng</TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center" sx={{ border: "1px solid #000" }}>Kỷ luật</TableCell>
              <TableCell align="center" sx={{ border: "1px solid #000" }}>Vệ sinh</TableCell>
              <TableCell align="center" sx={{ border: "1px solid #000" }}>Chuyên cần</TableCell>
              <TableCell align="center" sx={{ border: "1px solid #000" }}>Xếp hàng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{idx + 1}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.className}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.academicScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.disciplineScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.hygieneScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.attendanceScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.lineUpScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.totalNeNepscore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.totalScore}</TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>{r.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
