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
  Snackbar,
  Alert,
  Divider,
  Stack,
} from "@mui/material";
import api from "../../api/api";
import * as XLSX from "xlsx";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Class {
  _id: string;
  className: string;
  grade: string;
}

interface ScoreRow {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized = (res.data || []).map((w: any, idx: number) => ({
        _id: w._id || w.id || String(idx),
        weekNumber: w.weekNumber || w.week || idx + 1,
        startDate: w.startDate || "",
        endDate: w.endDate || "",
      }));
      setWeeks(normalized);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      setDisciplineMax(res.data?.disciplineMax ?? 100);
    } catch (err) {
      console.error("Lỗi khi lấy setting:", err);
    }
  };

  // ---- load dữ liệu ----
  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần", severity: "error" });
      return;
    }

    try {
      const [violationsRes, hygieneRes, attendanceRes, lineupRes] = await Promise.all([
        api.get(`/api/class-violation-scores?weekNumber=${selectedWeek.weekNumber}`),
        api.get(`/api/class-hygiene-scores?weekNumber=${selectedWeek.weekNumber}`),
        api.get(`/api/class-attendance-summaries?weekNumber=${selectedWeek.weekNumber}`),
        api.get(`/api/class-lineup-summaries?weekNumber=${selectedWeek.weekNumber}`),
      ]);

      const violations = violationsRes.data || [];
      const hygiene = hygieneRes.data || [];
      const attendance = attendanceRes.data || [];
      const lineup = lineupRes.data || [];

      const data: ScoreRow[] = classes.map((cls) => {
        const vItem = violations.find((x: any) => x.className === cls.className);
        const hItem = hygiene.find((x: any) => x.className === cls.className);
        const aItem = attendance.find((x: any) => x.className === cls.className);
        const lItem = lineup.find((x: any) => x.className === cls.className);

        const v = (vItem && (vItem.totalScore ?? vItem.score ?? 0)) || 0;
        const h = (hItem && (hItem.totalScore ?? hItem.score ?? 0)) || 0;
        const a = (aItem && (aItem.totalScore ?? aItem.score ?? 0)) || 0;
        const l = (lItem && (lItem.totalScore ?? lItem.score ?? 0)) || 0;

        return {
          className: cls.className,
          grade: String(cls.grade),
          weekNumber: selectedWeek.weekNumber,
          academicScore: 0,
          bonusScore: 0,
          violationScore: Number(v),
          hygieneScore: Number(h),
          attendanceScore: Number(a),
          lineUpScore: Number(l),
          totalViolation: 0,
          totalScore: 0,
          rank: 0,
        };
      });

      setScores(data);
      setSnackbar({ open: true, message: "Đã load dữ liệu", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
      setSnackbar({ open: true, message: "Lỗi khi load dữ liệu", severity: "error" });
    }
  };

  // ---- tính điểm & xếp hạng ----
  const handleCalculate = () => {
    if (!scores.length) {
      setSnackbar({ open: true, message: "Chưa có dữ liệu để tính.", severity: "info" });
      return;
    }

    let updated = scores.map((s) => {
      const totalViolation =
        disciplineMax - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      if (!grouped[r.grade]) grouped[r.grade] = [];
      grouped[r.grade].push(r);
    });

    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      arr.forEach((row, idx) => {
        row.rank = idx + 1;
      });
    });

    // sort lại theo tên lớp
    updated.sort((a, b) => a.className.localeCompare(b.className, "vi", { numeric: true }));

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng", severity: "success" });
  };

  // ---- lưu dữ liệu ----
  const handleSave = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Chọn tuần trước khi lưu", severity: "error" });
      return;
    }
    try {
      await api.post("/api/class-weekly-scores", { weekNumber: selectedWeek.weekNumber, scores });
      setSnackbar({ open: true, message: "Đã lưu dữ liệu", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({ open: true, message: "Lưu thất bại", severity: "error" });
    }
  };

  // ---- export excel ----
  const handleExportExcel = () => {
    const filtered = gradeFilter === "all" ? scores : scores.filter((s) => s.grade === gradeFilter);
    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WeeklyScores");
    XLSX.writeFile(workbook, `WeeklyScores_Week${selectedWeek?.weekNumber}.xlsx`);
  };

  // ---- thay đổi điểm ----
  const handleChange = (className: string, field: keyof ScoreRow, value: number) => {
    const updated = scores.map((s) => (s.className === className ? { ...s, [field]: value } : s));
    setScores(updated);
  };

  const formatDateShort = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });
  const gradeKeys = Object.keys(groupedByGrade).sort((a, b) => Number(a) - Number(b));

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ minWidth: 200 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({formatDateShort(w.startDate)} → {formatDateShort(w.endDate)})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Chọn khối"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          sx={{ minWidth: 150 }}
          size="small"
        >
          <MenuItem value="all">Tất cả</MenuItem>
          {gradeKeys.map((g) => (
            <MenuItem key={g} value={g}>
              Khối {g}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={handleLoadData}>
          Gọi dữ liệu
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCalculate}>
          Tính xếp hạng
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          Lưu
        </Button>
        <Button variant="outlined" onClick={handleExportExcel}>
          Xuất Excel
        </Button>
      </Stack>

      {gradeKeys.length === 0 && <Typography>Chưa có dữ liệu.</Typography>}

      {gradeKeys
        .filter((g) => gradeFilter === "all" || gradeFilter === g)
        .map((grade) => {
          const rows = groupedByGrade[grade] || [];
          return (
            <Box key={grade} mb={4}>
              <Typography variant="h6" gutterBottom>
                Khối {grade} ({rows.length} lớp)
              </Typography>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell sx={{ width: 90 }}>Học tập</TableCell>
                      <TableCell sx={{ width: 90 }}>Thưởng</TableCell>
                      <TableCell sx={{ width: 90 }}>Vi phạm</TableCell>
                      <TableCell sx={{ width: 90 }}>Vệ sinh</TableCell>
                      <TableCell sx={{ width: 90 }}>Chuyên cần</TableCell>
                      <TableCell sx={{ width: 90 }}>Xếp hàng</TableCell>
                      <TableCell sx={{ width: 110 }}>Tổng nề nếp</TableCell>
                      <TableCell sx={{ width: 110 }}>Tổng</TableCell>
                      <TableCell sx={{ width: 70 }}>Hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow
                        key={r.className}
                        sx={{
                          backgroundColor:
                            r.rank === 1
                              ? "#FFD70055"
                              : r.rank === 2
                              ? "#C0C0C055"
                              : r.rank === 3
                              ? "#CD7F3255"
                              : "inherit",
                        }}
                      >
                        <TableCell>{r.className}</TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            sx={{ width: 70 }}
                            value={r.academicScore}
                            onChange={(e) => handleChange(r.className, "academicScore", Number(e.target.value))}
                          />
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            sx={{ width: 70 }}
                            value={r.bonusScore}
                            onChange={(e) => handleChange(r.className, "bonusScore", Number(e.target.value))}
                          />
                        </TableCell>

                        <TableCell>{r.violationScore}</TableCell>
                        <TableCell>{r.hygieneScore}</TableCell>
                        <TableCell>{r.attendanceScore}</TableCell>
                        <TableCell>{r.lineUpScore}</TableCell>

                        <TableCell>{r.totalViolation}</TableCell>
                        <TableCell>{r.totalScore}</TableCell>
                        <TableCell>{r.rank || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
              <Divider sx={{ my: 2 }} />
            </Box>
          );
        })}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
