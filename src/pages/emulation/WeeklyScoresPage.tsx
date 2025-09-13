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

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Score {
  _id: string;
  className: string;
  grade: string;
  academicScore: number; // SĐB
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore?: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100); // mặc định
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy weeks:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) {
        setDisciplineMax(res.data.disciplineMax);
      }
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      const list: Score[] = res.data.map((s: Score) => ({
        ...s,
        bonusScore: s.bonusScore || 0,
      }));

      const withCalc = calculateTotals(list);
      const withRanks = assignRanksPerGrade(withCalc);
      setScores(withRanks);

      if (res.data.length === 0) {
        setSnackbar({
          open: true,
          message: "Chưa có dữ liệu tuần này. Bấm 'Lấy dữ liệu' để tính.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
    }
  };

  const calculateTotals = (list: Score[]) => {
    return list.map((s) => {
      const totalViolation =
        disciplineMax -
        (s.disciplineScore + s.attendanceScore + s.hygieneScore + s.lineUpScore);

      const totalRankScore =
        s.academicScore + totalViolation + (s.bonusScore || 0);

      return { ...s, totalViolation, totalRankScore };
    });
  };

  // gán hạng theo khối nhưng giữ nguyên thứ tự danh sách
  const assignRanksPerGrade = (list: Score[]) => {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });

    Object.keys(byGrade).forEach((g) => {
      const sorted = [...byGrade[g]].sort(
        (a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0)
      );
      sorted.forEach((s, idx) => {
        const target = list.find((x) => x._id === s._id);
        if (target) target.rank = idx + 1;
      });
    });

    return [...list]; // giữ nguyên thứ tự ban đầu
  };

  const handleBonusChange = (id: string, value: number) => {
    const updated = scores.map((s) =>
      s._id === id ? { ...s, bonusScore: value } : s
    );
    const withCalc = calculateTotals(updated);
    const withRanks = assignRanksPerGrade(withCalc);
    setScores(withRanks);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores/save-bonus", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setSnackbar({
        open: true,
        message: "Đã lưu dữ liệu tuần thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
    }
  };

  const getRowStyle = (idx: number, rank?: number) => {
    let style: any = {
      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9", // zebra
    };
    if (rank === 1) style.backgroundColor = "#ffe082";
    if (rank === 2) style.backgroundColor = "#b2ebf2";
    if (rank === 3) style.backgroundColor = "#c8e6c9";
    return style;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
            setScores([]);
          }}
          sx={{ width: 150 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={fetchScores}>
          🔄 Tải dữ liệu
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          💾 Lưu
        </Button>
      </Stack>

      <Table component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell align="center">STT</TableCell>
            <TableCell align="center">Khối</TableCell>
            <TableCell align="center">Lớp</TableCell>
            <TableCell align="center">SĐB</TableCell>
            <TableCell align="center">Kỷ luật</TableCell>
            <TableCell align="center">Vệ sinh</TableCell>
            <TableCell align="center">Chuyên cần</TableCell>
            <TableCell align="center">Xếp hàng</TableCell>
            <TableCell align="center">Điểm nề nếp</TableCell>
            <TableCell align="center">Điểm thưởng</TableCell>
            <TableCell align="center">Tổng xếp hạng</TableCell>
            <TableCell align="center">Hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((s, idx) => (
            <TableRow key={s._id} sx={getRowStyle(idx, s.rank)}>
              <TableCell align="center">{idx + 1}</TableCell>
              <TableCell align="center">{s.grade}</TableCell>
              <TableCell align="center">{s.className}</TableCell>
              <TableCell align="center">{s.academicScore}</TableCell>
              <TableCell align="center">{s.disciplineScore}</TableCell>
              <TableCell align="center">{s.hygieneScore}</TableCell>
              <TableCell align="center">{s.attendanceScore}</TableCell>
              <TableCell align="center">{s.lineUpScore}</TableCell>
              <TableCell align="center">{s.totalViolation}</TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  size="small"
                  value={s.bonusScore || 0}
                  onChange={(e) =>
                    handleBonusChange(s._id, Number(e.target.value))
                  }
                  sx={{ width: 70, "& input": { textAlign: "center" } }}
                />
              </TableCell>
              <TableCell align="center">{s.totalRankScore}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {s.rank}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
