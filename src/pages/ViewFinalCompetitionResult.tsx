import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ScoreRow {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  hygieneScore: number;
  lineUpScore: number;
  attendanceScore: number;
  violationScore: number;
  disciplineScore: number;
  totalScore: number;
  rank: number;
  lastUpdated?: string;
}

export default function ViewFinalCompetitionResult() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  // 📆 Lấy danh sách tuần
  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) fetchScores(selectedWeek.weekNumber);
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized: Week[] = (res.data || []).map((w: any, idx: number) => ({
        _id: w._id || String(idx),
        weekNumber: Number(w.weekNumber ?? idx + 1),
        startDate: w.startDate || "",
        endDate: w.endDate || "",
      }));

      setWeeks(normalized);

      // 🕒 Tự động chọn tuần hiện tại
      const today = new Date();
      const current = normalized.find((w) => {
        const s = w.startDate ? new Date(w.startDate) : null;
        const e = w.endDate ? new Date(w.endDate) : null;
        return s && e && today >= s && today <= e;
      });

      setSelectedWeek(current || normalized[normalized.length - 1] || null);
    } catch (err) {
      console.error("Lỗi lấy tuần:", err);
    }
  };

  // ✅ Gọi API lấy dữ liệu tuần
  const fetchScores = async (weekNumber: number) => {
    try {
      const res = await api.get(`/api/class-weekly-scores/full/${weekNumber}`);
      const raw = res.data.data || res.data || [];

      const normalized: ScoreRow[] = raw.map((r: any) => ({
        _id: r._id,
        className: r.className || "",
        grade: r.grade || "",
        weekNumber: r.weekNumber || 0,
        academicScore: r.academicScore ?? 0,
        bonusScore: r.bonusScore ?? 0,
        hygieneScore: r.hygieneScore ?? 0,
        lineUpScore: r.lineUpScore ?? 0,
        attendanceScore: r.attendanceScore ?? 0,
        violationScore: r.violationScore ?? 0,
        disciplineScore: r.disciplineScore ?? 0,
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

  // ✅ Gom theo khối
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

      <Box display="flex" gap={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) =>
            setSelectedWeek(weeks.find((w) => w._id === e.target.value) || null)
          }
          sx={{ minWidth: 260 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
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
                        bg = { backgroundColor: "rgba(255,215,0,0.25)" }; // vàng
                      else if (r.rank === 2)
                        bg = { backgroundColor: "rgba(192,192,192,0.25)" }; // bạc
                      else if (r.rank === 3)
                        bg = { backgroundColor: "rgba(205,127,50,0.25)" }; // đồng

                      return (
                        <TableRow key={r._id || r.className} sx={bg}>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>{r.lineUpScore}</TableCell>
                          <TableCell>{r.violationScore}</TableCell>
                          <TableCell>{r.attendanceScore}</TableCell>
                          <TableCell>{r.hygieneScore}</TableCell>
                          <TableCell>{r.academicScore}</TableCell>
                          <TableCell>{r.bonusScore}</TableCell>
                          <TableCell>{r.disciplineScore}</TableCell>
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
