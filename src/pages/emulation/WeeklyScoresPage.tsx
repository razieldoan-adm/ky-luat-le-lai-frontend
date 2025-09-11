import { useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack, Backdrop, CircularProgress
} from '@mui/material';
import useWeeklyScores from './useWeeklyScores';

const DISCIPLINE_MAX = 100; // điểm nền nếp tối đa

export default function WeeklyScoresPage() {
  const {
    weeks,
    selectedWeek,
    setSelectedWeek,
    scores,
    loading,
    fetchScores,
    setScores,
    saveScores,
  } = useWeeklyScores();

  // 🏁 Load dữ liệu khi chọn tuần
  useEffect(() => {
    if (selectedWeek) {
      fetchScores(selectedWeek.weekNumber);
    }
  }, [selectedWeek]);

  // 👉 Tính lại điểm và xếp hạng
  const handleCalculate = () => {
    const updated = scores.map((cls) => {
      // Tổng điểm nề nếp
      const totalNeNep = Math.max(
        0,
        DISCIPLINE_MAX - (cls.violationScore + cls.hygieneScore + cls.attendanceScore + cls.lineUpScore)
      );

      // Tổng điểm cuối
      const totalScore = cls.academicScore + cls.bonusScore + totalNeNep;

      return {
        ...cls,
        totalNeNep,
        totalScore,
      };
    });

    // Xếp hạng theo tổng điểm
    const ranked = [...updated].sort((a, b) => b.totalScore - a.totalScore);
    ranked.forEach((cls, idx) => {
      updated.find(c => c.className === cls.className)!.rank = idx + 1;
    });

    setScores(updated);
  };

  const handleSave = async () => {
    if (selectedWeek) {
      await saveScores(selectedWeek.weekNumber, scores);
      alert('✅ Đã lưu dữ liệu tuần thành công!');
    }
  };

  const getRowStyle = (rank: number) => {
    switch (rank) {
      case 1: return { backgroundColor: '#ffe082' };
      case 2: return { backgroundColor: '#b2ebf2' };
      case 3: return { backgroundColor: '#c8e6c9' };
      default: return {};
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ''}
          onChange={(e) => {
            const week = weeks.find(w => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ width: 150 }}
        >
          {weeks.map(w => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={() => selectedWeek && fetchScores(selectedWeek.weekNumber)}>
          🔄 Xem lại
        </Button>
        <Button variant="contained" color="primary" onClick={handleCalculate}>
          ➕ Tính điểm & xếp hạng
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          💾 Lưu
        </Button>
      </Stack>

      <Table component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>Điểm học tập</TableCell>
            <TableCell>Điểm thưởng</TableCell>
            <TableCell>Điểm vi phạm</TableCell>
            <TableCell>Điểm vệ sinh</TableCell>
            <TableCell>Điểm chuyên cần</TableCell>
            <TableCell>Điểm xếp hàng</TableCell>
            <TableCell>Tổng điểm nề nếp</TableCell>
            <TableCell>Tổng</TableCell>
            <TableCell>Xếp hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((cls, idx) => (
            <TableRow key={cls.className} sx={getRowStyle(cls.rank)}>
              <TableCell align="center">{idx + 1}</TableCell>
              <TableCell align="center">{cls.className}</TableCell>
              <TableCell align="center">{cls.academicScore}</TableCell>
              <TableCell align="center">{cls.bonusScore}</TableCell>
              <TableCell align="center">{cls.violationScore}</TableCell>
              <TableCell align="center">{cls.hygieneScore}</TableCell>
              <TableCell align="center">{cls.attendanceScore}</TableCell>
              <TableCell align="center">{cls.lineUpScore}</TableCell>
              <TableCell align="center">{cls.totalNeNep}</TableCell>
              <TableCell align="center">{cls.totalScore}</TableCell>
              <TableCell align="center">{cls.rank || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ✅ Loading overlay */}
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
