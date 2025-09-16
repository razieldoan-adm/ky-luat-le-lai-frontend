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
  weekNumber?: number;
  academicScore?: number; // SĐB
  disciplineScore?: number; // điểm trừ
  hygieneScore?: number; // điểm trừ
  attendanceScore?: number; // điểm trừ
  lineUpScore?: number; // điểm trừ
  bonusScore?: number;
  totalViolation?: number; // disciplineMax - tổng trừ
  totalRankScore?: number; // academic + totalViolation + bonus
  rank?: number;
  disciplineMax?: number;
}

interface ClassItem {
  _id: string;
  className: string;
  grade: string;
  teacher: string;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
    fetchClasses();
  }, []);

  useEffect(() => {
    setScores([]);
  }, [selectedWeek]);

  // === API ===
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy weeks:", err);
      setSnackbar({
        open: true,
        message: "Không tải được danh sách tuần.",
        severity: "error",
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) {
        setDisciplineMax(Number(res.data.disciplineMax));
      }
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes/with-teacher");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  const fetchScores = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      const validClasses = classList
        .filter((c) => c.teacher && c.teacher.trim() !== "")
        .map((c) => normalize(c.className));

      const filtered = res.data.filter((s: Score) =>
        validClasses.includes(normalize(s.className))
      );

      const list: Score[] = filtered.map((s: Score) => ({
        ...s,
        bonusScore: Number(s.bonusScore) || 0,
      }));

      const computed = computeTotalsIfMissing(list);
      const ranked = assignRanksPerGrade(computed);
      setScores(ranked);

      if (filtered.length === 0) {
        setSnackbar({
          open: true,
          message: "Chưa có dữ liệu tuần này. Bấm 'Gom dữ liệu' để tính.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi tải dữ liệu điểm.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAggregate = async () => {
    if (!selectedWeek) {
      setSnackbar({
        open: true,
        message: "Hãy chọn tuần trước.",
        severity: "info",
      });
      return;
    }
    setLoading(true);
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
      console.error("Lỗi khi gom dữ liệu:", err);
      setSnackbar({
        open: true,
        message: "Không gom được dữ liệu. Kiểm tra backend.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRank = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      await api.post("/api/class-weekly-scores/calculate-total-rank", {
        weekNumber: selectedWeek.weekNumber,
      });
      await fetchScores();
      setSnackbar({
        open: true,
        message: "Đã tính xếp hạng!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi tính xếp hạng:", err);
      setSnackbar({
        open: true,
        message: "Không tính được xếp hạng.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores", {
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
      setSnackbar({
        open: true,
        message: "Có lỗi khi lưu dữ liệu!",
        severity: "error",
      });
    }
  };

  // === Utils ===
  const normalize = (str?: string) =>
    str ? str.toString().trim().toUpperCase() : "";

  const computeTotalsIfMissing = (list: Score[]): Score[] => {
    return list.map((s) => {
      const disciplineScore = Number(s.disciplineScore) || 0;
      const hygieneScore = Number(s.hygieneScore) || 0;
      const attendanceScore = Number(s.attendanceScore) || 0;
      const lineUpScore = Number(s.lineUpScore) || 0;
      const bonus = Number(s.bonusScore) || 0;
      const academic = Number(s.academicScore) || 0;
      const max = Number(s.disciplineMax || disciplineMax);

      const totalViolation =
        typeof s.totalViolation === "number"
          ? s.totalViolation
          : max - (disciplineScore + hygieneScore + attendanceScore + lineUpScore);

      const totalRankScore =
        typeof s.totalRankScore === "number"
          ? s.totalRankScore
          : academic + totalViolation + bonus;

      return {
        ...s,
        totalViolation,
        totalRankScore,
      };
    });
  };

  const assignRanksPerGrade = (list: Score[]): Score[] => {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      const g = s.grade || "unknown";
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(s);
    });

    Object.keys(byGrade).forEach((g) => {
      const sorted = [...byGrade[g]].sort(
        (a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0)
      );
      sorted.forEach((s, idx) => {
        const target = list.find(
          (x) => x._id === s._id && x.className === s.className
        );
        if (target) target.rank = idx + 1;
      });
    });

    return [...list];
  };

  const handleBonusChange = (id: string | undefined, value: number) => {
    if (!id) return;
    const updated = scores.map((s) =>
      s._id === id ? { ...s, bonusScore: value } : s
    );
    const withCalc = computeTotalsIfMissing(updated);
    const withRanks = assignRanksPerGrade(withCalc);
    setScores(withRanks);
  };

  const getRowStyle = (idx: number, rank?: number) => {
    let style: any = {
      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9",
    };
    if (rank === 1) style.backgroundColor = "#ffe082";
    if (rank === 2) style.backgroundColor = "#b2ebf2";
    if (rank === 3) style.backgroundColor = "#c8e6c9";
    return style;
  };

  // === UI ===
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
            setScores([]);
          }}
          sx={{ width: 300 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} (
              {new Date(w.startDate).toLocaleDateString()} -{" "}
              {new Date(w.endDate).toLocaleDateString()})
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAggregate}
            disabled={!selectedWeek || loading}
          >
            Gom dữ liệu
          </Button>
          <Button
            variant="outlined"
            onClick={fetchScores}
            disabled={!selectedWeek || loading}
          >
            🔄 Tải dữ liệu
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={handleCalculateRank}
            disabled={!selectedWeek || loading}
          >
            TÍNH XẾP HẠNG
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={!selectedWeek || scores.length === 0}
          >
            💾 Lưu
          </Button>
        </Stack>
      </Box>

      <Paper elevation={3} sx={{ width: "100%", overflowX: "auto", borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Kỷ luật (-)</TableCell>
              <TableCell>Vệ sinh (-)</TableCell>
              <TableCell>Chuyên cần (-)</TableCell>
              <TableCell>Xếp hàng (-)</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {scores.length > 0 ? (
              scores.map((s, i) => (
                <TableRow key={s._id || s.className} sx={getRowStyle(i, s.rank)}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.bonusScore ?? 0}
                      onChange={(e) =>
                        handleBonusChange(s._id, Number(e.target.value))
                      }
                      sx={{ width: 70, "& input": { textAlign: "center" } }}
                    />
                  </TableCell>
                  <TableCell align="center">{s.academicScore ?? "-"}</TableCell>
                  <TableCell align="center">{s.disciplineScore ?? 0}</TableCell>
                  <TableCell align="center">{s.hygieneScore ?? 0}</TableCell>
                  <TableCell align="center">{s.attendanceScore ?? 0}</TableCell>
                  <TableCell align="center">{s.lineUpScore ?? 0}</TableCell>
                  <TableCell align="center">
                    {typeof s.totalViolation === "number"
                      ? s.totalViolation
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {typeof s.totalRankScore === "number"
                      ? s.totalRankScore
                      : "-"}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {s.rank ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

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
