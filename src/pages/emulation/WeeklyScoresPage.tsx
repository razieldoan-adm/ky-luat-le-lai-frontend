import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from "@mui/material";
import axios from "axios";

interface WeeklyScore {
  className: string;
  grade: number;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

type Step = "idle" | "updated" | "ranked" | "saved";

const WeeklyScoresPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [step, setStep] = useState<Step>("idle");

  // load dữ liệu tuần đã lưu
  const fetchWeeklyScores = async () => {
    try {
      const res = await axios.get(`/api/class-weekly-scores`, {
        params: { weekNumber },
      });
      setScores(res.data || []);
      if (res.data && res.data.length > 0) {
        setStep("idle");
      } else {
        setStep("idle"); // chưa có dữ liệu
      }
    } catch (err) {
      console.error("Error loading weekly scores:", err);
    }
  };

  useEffect(() => {
    fetchWeeklyScores();
  }, [weekNumber]);

  // cập nhật lại điểm + tính rank
  const handleUpdate = async () => {
    try {
      const res = await axios.post(
        `/api/class-weekly-scores/update/${weekNumber}`
      );
      setScores(res.data || []);
      setStep("updated");
    } catch (err) {
      console.error("Error updating weekly scores:", err);
    }
  };

  // tính hạng (thực chất API update đã tính, chỉ để đổi trạng thái)
  const handleRank = () => {
    setStep("ranked");
  };

  // lưu dữ liệu
  const handleSave = async () => {
    try {
      await axios.post(`/api/class-weekly-scores/save`, {
        weekNumber,
        scores,
      });
      setStep("saved");
    } catch (err) {
      console.error("Error saving weekly scores:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần</Typography>
        <Select
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          size="small"
        >
          {[1, 2, 3, 4, 5].map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>

        {step === "idle" && (
          <Button variant="contained" color="warning" onClick={handleUpdate}>
            Cập nhật
          </Button>
        )}
        {step === "updated" && (
          <Button variant="contained" color="info" onClick={handleRank}>
            Tính hạng
          </Button>
        )}
        {step === "ranked" && (
          <Button variant="contained" color="success" onClick={handleSave}>
            Lưu
          </Button>
        )}
        {step === "saved" && (
          <Button variant="contained" disabled>
            Đã lưu
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">Học tập</TableCell>
              <TableCell align="center">Thưởng</TableCell>
              <TableCell align="center">Vi phạm</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Chuyên cần</TableCell>
              <TableCell align="center">Xếp hạng</TableCell>
              <TableCell align="center">Tổng nề nếp</TableCell>
              <TableCell align="center">Tổng</TableCell>
              <TableCell align="center">Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.className}>
                <TableCell align="center">{s.className}</TableCell>
                <TableCell align="center">{s.academicScore}</TableCell>
                <TableCell align="center">{s.bonusScore}</TableCell>
                <TableCell align="center">{s.violationScore}</TableCell>
                <TableCell align="center">{s.hygieneScore}</TableCell>
                <TableCell align="center">{s.attendanceScore}</TableCell>
                <TableCell align="center">{s.lineUpScore}</TableCell>
                <TableCell align="center">{s.totalViolation}</TableCell>
                <TableCell align="center">{s.totalScore}</TableCell>
                <TableCell align="center">{s.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WeeklyScoresPage;
