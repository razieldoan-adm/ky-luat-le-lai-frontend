import { useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack, Backdrop, CircularProgress
} from '@mui/material';
import useWeeklyScores, { WeeklyScore } from './useWeeklyScores';

export default function WeeklyScoresPage() {
  const {
    weeks,
    selectedWeek,
    setSelectedWeek,
    scores,
    loading,
    fetchScores,
    calculateScores,
    calculateTotalAndRank,
    saveScores,
    updateScores,
  } = useWeeklyScores();

  // 🏁 Load scores khi chọn tuần
  useEffect(() => {
    if (selectedWeek) {
      fetchScores(selectedWeek.weekNumber);
    }
  }, [selectedWeek]);

  // ✅ Kiểm tra tuần đã có dữ liệu hay chưa
  const hasExistingData = scores.some((s: WeeklyScore) => s._id);

  const handleCalculate = async () => {
    if (selectedWeek) {
      await calculateScores(selectedWeek.weekNumber);
    }
  };

  const handleCalculateTotalAndRank = async () => {
    if (selectedWeek) {
      await calculateTotalAndRank(selectedWeek.weekNumber);
    }
  };

  const handleSave = async () => {
    if (selectedWeek) {
      await saveScores(selectedWeek.weekNumber, scores);
      alert('✅ Đã lưu dữ liệu tuần thành công!');
    }
  };

  const handleUpdate = async () => {
    if (selectedWeek) {
      await updateScores(selectedWeek.weekNumber, scores);
      alert('♻️ Đã cập nhật dữ liệu tuần thành công!');
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
          📥 Lấy dữ liệu
        </Button>
        <Button variant="contained" color="warning" onClick={handleCalculateTotalAndRank}>
          ➕ Tính tổng & xếp hạng
        </Button>

        {/* ✅ Hiển thị Save hoặc Update tùy theo trạng thái */}
        {!hasExistingData ? (
          <Button variant="contained" color="success" onClick={handleSave}>
            💾 Save
          </Button>
        ) : (
          <Button variant="contained" color="secondary" onClick={handleUpdate}>
            ♻️ Update
          </Button>
        )}
      </Stack>

      <Table component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>Điểm học tập</TableCell>
            <TableCell>Điểm vệ sinh</TableCell>
            <TableCell>Điểm chuyên cần</TableCell>
            <TableCell>Điểm xếp hàng</TableCell>
            <TableCell>Tổng lỗi nề nếp</TableCell>
            <TableCell>Tổng điểm</TableCell>
            <TableCell>Xếp hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((cls, idx) => (
            <TableRow key={cls.className} sx={getRowStyle(cls.rank)}>
              <TableCell align="center">{idx + 1}</TableCell>
              <TableCell align="center">{cls.className}</TableCell>
              <TableCell align="center">{cls.academicScore}</TableCell>
              <TableCell align="center">{cls.hygieneScore}</TableCell>
              <TableCell align="center">{cls.attendanceScore}</TableCell>
              <TableCell align="center">{cls.lineUpScore}</TableCell>
              <TableCell align="center">{cls.totalViolation}</TableCell>
              <TableCell align="center">{cls.totalScore}</TableCell>
              <TableCell align="center">{cls.rank === 0 ? '-' : cls.rank}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ✅ Loading Backdrop */}
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
