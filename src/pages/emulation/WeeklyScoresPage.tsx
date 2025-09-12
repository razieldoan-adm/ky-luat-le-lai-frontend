import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import api from "../../api/api"; // ⚠️ chỉnh lại đường dẫn nếu file api của bạn nằm chỗ khác

interface Week {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ClassScore {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  totalScore: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(false);

  // lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      console.log("Weeks API:", res.data);

      if (Array.isArray(res.data)) {
        setWeeks(res.data);
      } else {
        setWeeks([]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
      setWeeks([]);
    }
  };

  // lấy điểm theo tuần
  const fetchScores = async (week: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/class-violation-scores/week/${week}`);
      console.log("Scores API:", res.data);

      if (Array.isArray(res.data)) {
        setScores(res.data);
      } else {
        setScores([]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy điểm:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek !== "") {
      fetchScores(Number(selectedWeek));
    }
  }, [selectedWeek]);

  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm tuần
      </Typography>

      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel id="week-select-label">Chọn tuần</InputLabel>
        <Select
          labelId="week-select-label"
          value={selectedWeek}
          label="Chọn tuần"
          onChange={(e) => setSelectedWeek(e.target.value as number)}
        >
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber}
              {w.startDate && w.endDate
                ? ` (${w.startDate} - ${w.endDate})`
                : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <CircularProgress />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Điểm kỷ luật</TableCell>
              <TableCell>Tổng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>{row.academicScore}</TableCell>
                <TableCell>{row.bonusScore}</TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default WeeklyScoresPage;
