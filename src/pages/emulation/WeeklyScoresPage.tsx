import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Button,
  TextField,
} from "@mui/material";
import api from "@/utils/api";

interface ClassScore {
  className: string;
  grade: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

export default function WeeklyScoresPage() {
  const [week, setWeek] = useState(1);
  const [scores, setScores] = useState<ClassScore[]>([]);

  useEffect(() => {
    loadData();
  }, [week]);

  const loadData = async () => {
    try {
      const res = await api.get(`/api/class-violation-scores/week/${week}`);
      const data = res.data.map((cls: any) => ({
        ...cls,
        bonusScore: cls.bonusScore ?? 0,
      }));

      // tính toán total
      data.forEach((c: any) => {
        c.totalViolation =
          c.disciplineScore +
          c.hygieneScore +
          c.attendanceScore +
          c.lineUpScore;
        c.totalScore = c.academicScore + c.totalViolation + c.bonusScore;
      });

      setScores(data);
    } catch (err) {
      console.error("Load error:", err);
    }
  };

  // cập nhật điểm thưởng
  const onBonusChange = (className: string, value: number) => {
    setScores((prev) =>
      prev.map((c) =>
        c.className === className ? { ...c, bonusScore: value } : c
      )
    );
  };

  // lưu vào DB
  const handleSave = async () => {
    try {
      await api.post("/api/class-violation-scores/save", {
        weekNumber: week,
        scores,
      });
      alert("Đã lưu thành công!");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  return (
    <Container>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
        {[...Array(10)].map((_, i) => (
          <MenuItem key={i + 1} value={i + 1}>
            Tuần {i + 1}
          </MenuItem>
        ))}
      </Select>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">STT</TableCell>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">Học tập</TableCell>
              <TableCell align="center">Kỷ luật</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Chuyên cần</TableCell>
              <TableCell align="center">Xếp hàng</TableCell>
              <TableCell align="center">Điểm thưởng</TableCell>
              <TableCell align="center">Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((cls, idx) => (
              <TableRow key={cls.className}>
                <TableCell align="center">{idx + 1}</TableCell>
                <TableCell align="center">{cls.className}</TableCell>
                <TableCell align="center">{cls.academicScore}</TableCell>
                <TableCell align="center">{cls.disciplineScore}</TableCell>
                <TableCell align="center">{cls.hygieneScore}</TableCell>
                <TableCell align="center">{cls.attendanceScore}</TableCell>
                <TableCell align="center">{cls.lineUpScore}</TableCell>

                {/* editable bonusScore */}
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={cls.bonusScore}
                    onChange={(e) =>
                      onBonusChange(cls.className, Number(e.target.value))
                    }
                    sx={{ width: 80 }}
                  />
                </TableCell>

                <TableCell align="center">{cls.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleSave}
      >
        Lưu
      </Button>
    </Container>
  );
}
