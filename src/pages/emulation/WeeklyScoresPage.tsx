import { useEffect, useState } from "react";
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
  MenuItem,
  Stack,
  Snackbar,
  Alert,
  Select,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Score {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
}

const WeeklyScoresPage = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // load danh sách tuần + setting
  useEffect(() => {
    const fetchWeeksAndSettings = async () => {
      try {
        const [weekRes, settingRes] = await Promise.all([
          api.get("/api/weeks"),
          api.get("/api/settings"),
        ]);
        setWeeks(weekRes.data);
        if (weekRes.data.length > 0) {
          setSelectedWeek(weekRes.data[0]);
        }
        setDisciplineMax(settingRes.data?.disciplineMax || 100);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWeeksAndSettings();
  }, []);

  // load điểm khi đổi tuần
  useEffect(() => {
    if (selectedWeek) {
      fetchScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get(
        `/api/class-weekly-scores?weekNumber=${selectedWeek.weekNumber}`
      );
      const data: Score[] = res.data;

      // tính toán tổng điểm còn lại và xếp hạng
      const calculated = calculateTotals(data);
      setScores(calculated);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTotals = (data: Score[]): Score[] => {
    const grouped: Record<string, Score[]> = {};

    data.forEach((s) => {
      const totalViolation =
        disciplineMax -
        ((s.disciplineScore || 0) +
          (s.hygieneScore || 0) +
          (s.attendanceScore || 0) +
          (s.lineUpScore || 0));

      const totalRankScore =
        (s.academicScore || 0) +
        totalViolation +
        (s.bonusScore || 0);

      s.totalViolation = totalViolation;
      s.totalRankScore = totalRankScore;

      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    // xếp hạng theo khối
    for (const grade in grouped) {
      grouped[grade].sort((a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0));
      grouped[grade].forEach((s, i) => {
        s.rank = i + 1;
      });
    }

    return data;
  };

  const saveScores = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setSnackbar({
        open: true,
        message: "Lưu dữ liệu thành công!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Có lỗi khi lưu!",
        severity: "error",
      });
    }
  };

  const collectWeeklyData = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores/calculate", {
        weekNumber: selectedWeek.weekNumber,
      });
      await fetchScores();
      setSnackbar({
        open: true,
        message: "Đã gom dữ liệu tuần thành công!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Có lỗi khi gom dữ liệu!",
        severity: "error",
      });
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        📊 Bảng điểm thi đua tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Select
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const w = weeks.find((w) => w._id === e.target.value);
            if (w) setSelectedWeek(w);
          }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
            </MenuItem>
          ))}
        </Select>
        <Button variant="contained" color="primary" onClick={collectWeeklyData}>
          📥 Gom dữ liệu
        </Button>
        <Button variant="outlined" color="secondary" onClick={fetchScores}>
          🔄 Tải dữ liệu
        </Button>
        <Button variant="contained" color="success" onClick={saveScores}>
          💾 Lưu
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Kỷ luật (-)</TableCell>
              <TableCell>Vệ sinh (-)</TableCell>
              <TableCell>Chuyên cần (-)</TableCell>
              <TableCell>Điểm danh (-)</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng xếp hạng</TableCell>
              <TableCell>Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.grade}</TableCell>
                <TableCell>{s.academicScore}</TableCell>
                <TableCell>{s.bonusScore}</TableCell>
                <TableCell>{s.disciplineScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.lineUpScore}</TableCell>
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalRankScore}</TableCell>
                <TableCell>{s.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklyScoresPage;
