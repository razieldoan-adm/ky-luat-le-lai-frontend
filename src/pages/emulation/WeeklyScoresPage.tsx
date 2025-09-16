import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface ClassData {
  className: string;
  grade: string;
  violation: number;
  hygiene: number;
  attendance: number;
  lineup: number;
  academicScore: number;
  bonusScore: number;
  totalDiscipline: number;
  totalScore: number;
  rank: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [rows, setRows] = useState<ClassData[]>([]);

  // Load dữ liệu từ backend
  const handleLoadData = async () => {
    try {
      const [attRes, hygRes, lineupRes, vioRes] = await Promise.all([
        api.get(`/api/classattendancesummaries?weekNumber=${weekNumber}`),
        api.get(`/api/classhygienescores?weekNumber=${weekNumber}`),
        api.get(`/api/classlineupsummaries?weekNumber=${weekNumber}`),
        api.get(`/api/classviolationscores?weekNumber=${weekNumber}`),
      ]);

      const attendance = attRes.data;
      const hygiene = hygRes.data;
      const lineup = lineupRes.data;
      const violation = vioRes.data;

      // Gom dữ liệu
      const classes: Record<string, ClassData> = {};

      [...attendance, ...hygiene, ...lineup, ...violation].forEach((item: any) => {
        const name = item.className;
        if (!classes[name]) {
          classes[name] = {
            className: name,
            grade: item.grade || "",
            violation: 0,
            hygiene: 0,
            attendance: 0,
            lineup: 0,
            academicScore: 0,
            bonusScore: 0,
            totalDiscipline: 0,
            totalScore: 0,
            rank: 0,
          };
        }

        if ("violationScore" in item) classes[name].violation = item.violationScore;
        if ("hygieneScore" in item) classes[name].hygiene = item.hygieneScore;
        if ("attendanceScore" in item) classes[name].attendance = item.attendanceScore;
        if ("lineupScore" in item) classes[name].lineup = item.lineupScore;
      });

      setRows(Object.values(classes));
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
    }
  };

  // Tính toán điểm
  const handleCalculate = () => {
    const updated = rows.map((r) => {
      const totalDiscipline =
        100 - (r.violation + r.hygiene + r.attendance + r.lineup);
      const totalScore = r.academicScore + r.bonusScore + totalDiscipline;
      return { ...r, totalDiscipline, totalScore };
    });

    // Xếp hạng
    updated.sort((a, b) => b.totalScore - a.totalScore);
    updated.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    setRows([...updated]);
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    try {
      await api.post("/api/weekly-scores/save", { weekNumber, rows });
      alert("Đã lưu thành công!");
    } catch (err) {
      console.error("Lỗi lưu:", err);
    }
  };

  // Cập nhật giá trị nhập tay
  const handleInputChange = <K extends keyof ClassData>(
    index: number,
    field: K,
    value: ClassData[K]
  ) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Weekly Scores - Tuần {weekNumber}
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Tuần"
          type="number"
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          size="small"
          sx={{ width: 120 }}
        />
        <Button variant="contained" color="primary" onClick={handleLoadData}>
          Tải dữ liệu
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCalculate}>
          Tính toán
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          Lưu
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>{row.violation}</TableCell>
                <TableCell>{row.hygiene}</TableCell>
                <TableCell>{row.attendance}</TableCell>
                <TableCell>{row.lineup}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) =>
                      handleInputChange(idx, "academicScore", Number(e.target.value))
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={(e) =>
                      handleInputChange(idx, "bonusScore", Number(e.target.value))
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{row.totalDiscipline}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
                <TableCell>{row.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WeeklyScoresPage;
