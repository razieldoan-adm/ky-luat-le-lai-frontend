import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
} from "@mui/material";
import api from "../../api/api";

interface ClassData {
  className: string;
  grade: string;
  violationScore: number; // điểm kỷ luật
  attendanceScore: number; // điểm chuyên cần
  lineupScore: number; // điểm vệ sinh
  academicScore: number; // điểm học tập (nhập tay)
  bonusScore: number; // điểm thưởng (nhập tay)
  totalDiscipline: number; // tổng nề nếp
  totalScore: number; // tổng điểm
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [week, setWeek] = useState<number>(1);
  const [rows, setRows] = useState<ClassData[]>([]);

  // Load dữ liệu từ 3 API
  const handleLoadData = async () => {
    try {
      const [violationRes, attendanceRes, lineupRes] = await Promise.all([
        api.get(`/class-violation-scores/by-week?weekNumber=${week}`),
        api.get(`/class-attendance-summaries/by-week?weekNumber=${week}`),
        api.get(`/class-lineup-summaries/by-week?weekNumber=${week}`),
      ]);

      const violationScores: any[] = violationRes.data;
      const attendanceScores: any[] = attendanceRes.data;
      const lineupScores: any[] = lineupRes.data;

      // Gộp dữ liệu theo className
      const merged: ClassData[] = violationScores.map((v) => {
        const att = attendanceScores.find((a) => a.className === v.className);
        const lin = lineupScores.find((l) => l.className === v.className);

        return {
          className: v.className,
          grade: v.grade || "",
          violationScore: v.violationScore || 0,
          attendanceScore: att ? att.score : 0,
          lineupScore: lin ? lin.score : 0,
          academicScore: 0,
          bonusScore: 0,
          totalDiscipline: 0,
          totalScore: 0,
        };
      });

      setRows(merged);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
    }
  };

  // Cập nhật giá trị nhập tay
  const handleInputChange = (
    index: number,
    field: keyof ClassData,
    value: number
  ) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  // Tính toán trên FE
  const handleCalculate = () => {
    const calculated = rows.map((row) => {
      const totalDiscipline =
        row.violationScore + row.attendanceScore + row.lineupScore;
      const totalScore =
        totalDiscipline + row.academicScore + row.bonusScore;
      return { ...row, totalDiscipline, totalScore };
    });

    // Xếp hạng theo tổng điểm
    calculated.sort((a, b) => b.totalScore - a.totalScore);
    calculated.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    setRows([...calculated]);
  };

  // Lưu dữ liệu vào backend
  const handleSave = async () => {
    try {
      await Promise.all(
        rows.map((row) =>
          api.post("/class-violation-scores", {
            className: row.className,
            weekNumber: week,
            violationScore: row.violationScore,
            attendanceScore: row.attendanceScore,
            lineupScore: row.lineupScore,
            academicScore: row.academicScore,
            bonusScore: row.bonusScore,
            totalDiscipline: row.totalDiscipline,
            totalScore: row.totalScore,
            rank: row.rank,
            grade: row.grade,
          })
        )
      );
      alert("Đã lưu thành công!");
    } catch (err) {
      console.error("Lỗi lưu dữ liệu:", err);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h6">Weekly Scores - Tuần {week}</Typography>

      <Box display="flex" alignItems="center" mb={2} gap={2}>
        <TextField
          select
          label="Tuần"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          size="small"
          sx={{ width: 120 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={handleLoadData}>
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
              <TableCell>Xếp hạng</TableCell>
              <TableCell>
                Điểm học tập <br /> (nhập tay)
              </TableCell>
              <TableCell>
                Điểm thưởng <br /> (nhập tay)
              </TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.className}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.lineupScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.rank || "-"}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) =>
                      handleInputChange(
                        index,
                        "academicScore",
                        Number(e.target.value)
                      )
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
                      handleInputChange(
                        index,
                        "bonusScore",
                        Number(e.target.value)
                      )
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{row.totalDiscipline}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WeeklyScoresPage;
