// src/pages/emulation/WeeklyScoresPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  attendanceScore: number;
  hygieneScore: number;
  lineupScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

const WeeklyScoresPage = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadTempScores();
  }, [weekNumber]);

  const loadTempScores = async () => {
    try {
      const res = await api.get("/api/class-weekly-scores/temp", {
        params: { weekNumber },
      });
      setScores(res.data);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
      setError("Không thể tải dữ liệu thô");
    }
  };

  const loadSavedScores = async () => {
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber },
      });
      setScores(res.data);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
      setError("Không thể tải dữ liệu đã lưu");
    }
  };

  const handleSave = async () => {
    try {
      await api.post("/api/class-weekly-scores", { weekNumber, scores });
      setMessage("Đã lưu điểm tuần");
    } catch (err) {
      console.error("Lỗi lưu dữ liệu:", err);
      setError("Không thể lưu điểm tuần");
    }
  };

  const handleChangeScore = (
    index: number,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    const newScores = [...scores];
    newScores[index][field] = value;

    // cập nhật lại totalScore
    newScores[index].totalScore =
      newScores[index].academicScore +
      newScores[index].bonusScore +
      newScores[index].totalViolation;

    setScores(newScores);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Điểm thi đua tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          size="small"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={loadTempScores}>
          Tải dữ liệu thô
        </Button>
        <Button variant="outlined" onClick={loadSavedScores}>
          Tải dữ liệu đã lưu
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Lưu
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Vi phạm</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Tổng kỷ luật</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s, idx) => (
              <TableRow key={idx}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.grade}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.lineupScore}</TableCell>
                <TableCell>{s.violationScore}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={s.academicScore}
                    onChange={(e) =>
                      handleChangeScore(idx, "academicScore", Number(e.target.value))
                    }
                    size="small"
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={s.bonusScore}
                    onChange={(e) =>
                      handleChangeScore(idx, "bonusScore", Number(e.target.value))
                    }
                    size="small"
                    style={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalScore}</TableCell>
                <TableCell>
                  <strong>{s.ranking}</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage("")}
      >
        <Alert severity="success">{message}</Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError("")}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklyScoresPage;
