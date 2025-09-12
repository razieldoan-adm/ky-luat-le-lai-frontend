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
} from "@mui/material";



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

  // lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await fetch(`/api/academic-weeks/study-weeks`);
      const data = await res.json();
      console.log("Weeks API trả về:", data);

      if (Array.isArray(data)) {
        setWeeks(data);
      } else {
        setWeeks([]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  // lấy điểm theo tuần
  const fetchScores = async (week: number) => {
    try {
      const res = await fetch(`/api/class-violation-scores/week/${week}`);
      const data = await res.json();
      console.log("Scores API trả về:", data);

      if (Array.isArray(data)) {
        setScores(data);
      } else {
        setScores([]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy điểm:", err);
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
    </Paper>
  );
};

export default WeeklyScoresPage;
