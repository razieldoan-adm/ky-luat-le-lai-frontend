// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Select,
  MenuItem,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import useWeeklyScores from "./useWeeklyScores";

const WeeklyScoresPage: React.FC = () => {
  const { scores, weeks, selectedWeek, setSelectedWeek } = useWeeklyScores();
  const [week, setWeek] = useState(selectedWeek);

  // xử lý khi chọn tuần
  const handleWeekChange = (event: any) => {
    const value = event.target.value;
    setWeek(value);
    setSelectedWeek(value);
  };

  // Tính toán thêm cột "Tổng điểm Nề nếp", "Tổng", "Xếp hạng"
  const computedScores = scores.map((cls) => {
    const discipline = cls.disciplineScore ?? 0;
    const hygiene = cls.hygieneScore ?? 0;
    const diligence = cls.diligenceScore ?? 0;
    const lineup = cls.lineupScore ?? 0;
    const academic = cls.academicScore ?? 0;

    const totalNeNep = discipline + hygiene + diligence + lineup;
    const total = academic + totalNeNep;

    return {
      ...cls,
      totalNeNep,
      total,
    };
  });

  // Sắp xếp theo Tổng để gán xếp hạng
  const sortedScores = [...computedScores].sort((a, b) => b.total - a.total);
  sortedScores.forEach((cls, index) => {
    cls.rank = index + 1;
  });

  return (
    <Box p={3}>
      <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center">
        <EmojiEventsIcon sx={{ mr: 1, color: "gold" }} />
        Kết quả thi đua toàn trường theo tuần
      </Typography>

      {/* Chọn tuần */}
      <Select value={week} onChange={handleWeekChange} size="small" sx={{ mb: 2, minWidth: 120 }}>
        {weeks.map((w) => (
          <MenuItem key={w} value={w}>
            Tuần {w}
          </MenuItem>
        ))}
      </Select>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Tổng số lớp: {scores.length}
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">STT</TableCell>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">Học tập</TableCell>
              <TableCell align="center">Kỷ luật</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Chuyên cần</TableCell>
              <TableCell align="center">Xếp hàng</TableCell>
              <TableCell align="center">Tổng điểm Nề nếp</TableCell>
              <TableCell align="center">Tổng</TableCell>
              <TableCell align="center">Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedScores.map((cls, idx) => (
              <TableRow key={cls.className}>
                <TableCell align="center">{idx + 1}</TableCell>
                <TableCell align="center">{cls.className}</TableCell>
                <TableCell align="center">{cls.academicScore}</TableCell>
                <TableCell align="center">{cls.disciplineScore}</TableCell>
                <TableCell align="center">{cls.hygieneScore}</TableCell>
                <TableCell align="center">{cls.diligenceScore}</TableCell>
                <TableCell align="center">{cls.lineupScore}</TableCell>
                <TableCell align="center">{cls.totalNeNep}</TableCell>
                <TableCell align="center">{cls.total}</TableCell>
                <TableCell align="center">{cls.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WeeklyScoresPage;
