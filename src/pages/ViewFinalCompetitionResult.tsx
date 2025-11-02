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
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  rewardScore: number;
  hygieneScore: number;
  lineupScore: number;
  attendanceScore: number;
  violationScore: number;
  disciplineScore: number;
  totalScore: number;
  ranking: number;
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
        _id: w._id || w.id || String(idx),
        weekNumber: Number(w.weekNumber ?? w.week ?? idx + 1),
        startDate: w.startDate || "",
        endDate: w.endDate || "",
      }));
      setWeeks(normalized);
    } catch (err) {
      console.error("Lỗi lấy tuần:", err);
    }
  };

  // ✅ Gọi API mới /api/class-weekly-scores/full/:weekNumber
const fetchScores = async (weekNumber: number) => {
  try {
    const res = await api.get(`/api/class-weekly-scores/full/${weekNumber}`);
    const raw = res.data.data || [];

    const normalized = raw.map((r: any) => ({
      className: r.className || "",
      grade: r.grade || "",
      weekNumber: r.weekNumber || 0,
      academicScore: r.academicScore ?? r.studyScore ?? 0,
      rewardScore: r.rewardScore ?? r.bonusScore ?? 0,
      hygieneScore: r.hygieneScore ?? r.cleanScore ?? 0,
      lineupScore: r.lineupScore ?? r.lineScore ?? 0,
      attendanceScore: r.attendanceScore ?? r.presenceScore ?? 0,
      violationScore: r.violationScore ?? r.violation ?? 0,
      disciplineScore: r.disciplineScore ?? r.neNepScore ?? 0,
      totalScore: r.totalScore ?? r.sum ?? 0,
      ranking: r.ranking ?? r.rank ?? "-",
    }));

    setScores(normalized);
  } catch (err: any) {
    console.error("Lỗi lấy dữ liệu:", err);
    setSnackbar({
      open: true,
      message:
        err?.response?.data?.message || "Không có dữ liệu cho tuần này",
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
                      <TableCell>Học tập</TableCell>
                      <TableCell>Thưởng</TableCell>
                      <TableCell>Vệ sinh</TableCell>
                      <TableCell>Xếp hàng</TableCell>
                      <TableCell>Chuyên cần</TableCell>
                      <TableCell>Vi phạm</TableCell>
                      <TableCell>Tổng nề nếp</TableCell>
                      <TableCell>Tổng</TableCell>
                      <TableCell>Hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      let bg = {};
                      if (r.ranking === 1)
                        bg = { backgroundColor: "rgba(255,215,0,0.25)" }; // vàng
                      else if (r.ranking === 2)
                        bg = { backgroundColor: "rgba(192,192,192,0.25)" }; // bạc
                      else if (r.ranking === 3)
                        bg = { backgroundColor: "rgba(205,127,50,0.25)" }; // đồng

                      return (
                        <TableRow key={r.className} sx={bg}>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>{r.academicScore}</TableCell>
                          <TableCell>{r.rewardScore}</TableCell>
                          <TableCell>{r.hygieneScore}</TableCell>
                          <TableCell>{r.lineupScore}</TableCell>
                          <TableCell>{r.attendanceScore}</TableCell>
                          <TableCell>{r.violationScore}</TableCell>
                          <TableCell>{r.disciplineScore}</TableCell>
                          <TableCell>{r.totalScore}</TableCell>
                          <TableCell>{r.ranking || "-"}</TableCell>
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
