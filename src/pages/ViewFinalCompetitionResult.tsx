import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import api from "../api/api";

interface Week {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ScoreRow {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  hygieneScore: number;
  lineUpScore: number;
  attendanceScore: number;
  violationScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
  lastUpdated?: string;
}

export default function ViewFinalCompetitionResult() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info",
  });

  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  // --- Load danh sách tuần + tuần hiện tại ---
  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const list: Week[] = (res.data || []).map((w: any, idx: number) => ({
        weekNumber: Number(w.weekNumber ?? idx + 1),
        startDate: w.startDate,
        endDate: w.endDate,
      }));
      setWeeks(list);

      const cur = await api.get("/api/academic-weeks/current");
      const currentNum = cur.data?.weekNumber ?? null;
      setCurrentWeek(currentNum);
      setSelectedWeek(currentNum);
    } catch (err) {
      console.error("Lỗi khi tải tuần:", err);
      setWeeks([]);
      setCurrentWeek(null);
      setSelectedWeek(null);
    }
  };

  useEffect(() => {
    loadWeeks();
  }, []);

  // --- Khi đổi tuần hoặc tuần hiện tại ---
  useEffect(() => {
    const week = selectedWeek ?? currentWeek;
    if (week) fetchScores(week);
  }, [currentWeek, selectedWeek]);

  // --- Gọi API lấy điểm ---
  const fetchScores = async (weekNumber: number) => {
    try {
      const res = await api.get(`/api/class-weekly-scores/full/${weekNumber}`);
      const raw = res.data.data || res.data || [];

      const normalized: ScoreRow[] = raw.map((r: any) => ({
        className: r.className || "",
        grade: r.grade || "",
        weekNumber: r.weekNumber || 0,
        academicScore: r.academicScore ?? 0,
        bonusScore: r.bonusScore ?? 0,
        hygieneScore: r.hygieneScore ?? 0,
        lineUpScore: r.lineUpScore ?? 0,
        attendanceScore: r.attendanceScore ?? 0,
        violationScore: r.violationScore ?? 0,
        totalViolation: r.totalViolation ?? 0,
        totalScore: r.totalScore ?? 0,
        rank: r.rank ?? 0,
        lastUpdated: r.updatedAt,
      }));

      setScores(normalized);
    } catch (err: any) {
      console.error("Lỗi lấy dữ liệu:", err);
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || "Không có dữ liệu cho tuần này",
        severity: "info",
      });
      setScores([]);
    }
  };

  // --- Gom nhóm theo khối ---
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });
  const gradeKeys = Object.keys(groupedByGrade).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Kết quả thi đua tuần
      </Typography>

      {/* --- Chọn tuần và khối --- */}
      <Box display="flex" gap={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek ?? ""}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          sx={{ minWidth: 260 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber} ({formatDateShort(w.startDate)} →{" "}
              {formatDateShort(w.endDate)})
            </MenuItem>
          ))}
        </TextField>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Khối</InputLabel>
          <Select
            value={gradeFilter}
            label="Khối"
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="6">Khối 6</MenuItem>
            <MenuItem value="7">Khối 7</MenuItem>
            <MenuItem value="8">Khối 8</MenuItem>
            <MenuItem value="9">Khối 9</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* --- Bảng điểm --- */}
      {gradeKeys
        .filter((g) => gradeFilter === "all" || g === gradeFilter)
        .map((grade) => {
          const rows = groupedByGrade[grade].slice().sort((a, b) =>
            a.className.localeCompare(b.className)
          );
          return (
            <Box key={grade} mb={4}>
              <Typography variant="h6" gutterBottom>
                {grade === "undefined"
                  ? `Khối chưa xác định`
                  : `Khối ${grade}`}{" "}
                ({rows.length} lớp)
              </Typography>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Xếp hàng</TableCell>
                      <TableCell>Vi phạm</TableCell>
                      <TableCell>Chuyên cần</TableCell>
                      <TableCell>Vệ sinh</TableCell>
                      <TableCell>Học tập</TableCell>
                      <TableCell>Thưởng</TableCell>
                      <TableCell>Kỷ luật</TableCell>
                      <TableCell>Tổng thi đua</TableCell>
                      <TableCell>Xếp hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      let bg = {};
                      if (r.rank === 1)
                        bg = { backgroundColor: "rgba(255,215,0,0.25)" };
                      else if (r.rank === 2)
                        bg = { backgroundColor: "rgba(192,192,192,0.25)" };
                      else if (r.rank === 3)
                        bg = { backgroundColor: "rgba(205,127,50,0.25)" };

                      return (
                        <TableRow key={r.className} sx={bg}>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>{r.lineUpScore}</TableCell>
                          <TableCell>{r.violationScore}</TableCell>
                          <TableCell>{r.attendanceScore}</TableCell>
                          <TableCell>{r.hygieneScore}</TableCell>
                          <TableCell>{r.academicScore}</TableCell>
                          <TableCell>{r.bonusScore}</TableCell>
                          <TableCell>{r.totalViolation}</TableCell>
                          <TableCell>{r.totalScore}</TableCell>
                          <TableCell>{r.rank || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
              <Divider sx={{ my: 2 }} />
            </Box>
          );
        })}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
