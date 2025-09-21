import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Paper,
  Snackbar,
  Alert,
  Divider,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import * as XLSX from "xlsx";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface Class {
  _id: string;
  className: string;
  grade: string;
  homeroomTeacher?: string;
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
  const [hasData, setHasData] = useState<boolean>(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // helper
  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  const resolveGrade = (className: string): string => {
    const cls = classes.find((c) => c.className === className);
    if (cls && cls.grade) return String(cls.grade);
    const m = className.match(/^(\d+)/);
    return m ? m[1] : "undefined";
  };

  const normalizeSavedScores = (arr: any[]): ScoreRow[] => {
    return (arr || []).map((r: any) => ({
      className: r.className || r.class || "",
      grade: String(r.grade ?? resolveGrade(r.className) ?? "undefined"),
      weekNumber: Number(r.weekNumber ?? r.week ?? selectedWeek?.weekNumber ?? 0),
      academicScore: Number(r.academicScore ?? 0),
      bonusScore: Number(r.bonusScore ?? 0),
      violationScore: Number(r.violationScore ?? 0),
      hygieneScore: Number(r.hygieneScore ?? 0),
      attendanceScore: Number(r.attendanceScore ?? 0),
      lineUpScore: Number(r.lineUpScore ?? 0),
      totalViolation: Number(r.totalViolation ?? 0),
      totalScore: Number(r.totalScore ?? 0),
      rank: Number(r.rank ?? 0),
    }));
  };

  // init
  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

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

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy lớp:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      setDisciplineMax(res.data?.disciplineMax ?? 100);
    } catch (err) {
      console.error("Lỗi lấy setting:", err);
    }
  };

  const checkHasData = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores", { params: { weekNumber } });
      const existing = res.data || [];
      if (existing.length > 0) {
        setHasData(true);
        setScores(normalizeSavedScores(existing));
      } else {
        setHasData(false);
        setScores([]);
      }
    } catch (err) {
      console.error("Check tuần lỗi:", err);
      setHasData(false);
      setScores([]);
    }
  };

  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần", severity: "error" });
      return;
    }
    try {
      const weekNum = selectedWeek.weekNumber;
      const [violations, hygiene, attendance, lineup] = await Promise.all([
        api.get("/api/class-violation-scores", { params: { weekNumber: weekNum } }),
        api.get("/api/class-hygiene-scores", { params: { weekNumber: weekNum } }),
        api.get("/api/class-attendance-summaries", { params: { weekNumber: weekNum } }),
        api.get("/api/class-lineup-summaries", { params: { weekNumber: weekNum } }),
      ]).then((res) => res.map((r) => r.data || []));
      console.log("== DEBUG DATA ==");
console.log("violations:", violations);
console.log("hygiene:", hygiene);
console.log("attendance:", attendance);
console.log("lineup:", lineup);

      const data: ScoreRow[] = classes.map((cls) => {
        const v = violations.find((x: any) => x.className === cls.className)?.totalScore || 0;
        const h = hygiene.find((x: any) => x.className === cls.className)?.totalScore || 0;
        const a = attendance.find((x: any) => x.className === cls.className)?.totalScore || 0;
        const l = lineup.find((x: any) => x.className === cls.className)?.totalScore || 0;
        return {
          className: cls.className,
          grade: String(cls.grade ?? resolveGrade(cls.className)),
          weekNumber: weekNum,
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
      setSnackbar({ open: true, message: "Đã load dữ liệu (chưa lưu)", severity: "success" });
    } catch (err) {
      console.error("Load dữ liệu lỗi:", err);
      setSnackbar({ open: true, message: "Lỗi khi load dữ liệu", severity: "error" });
    }
  };

  const handleCalculate = () => {
    if (!scores.length) return;
    let updated = scores.map((s) => {
      const totalViolation =
        disciplineMax - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // xếp hạng trong từng khối
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      if (!grouped[r.grade]) grouped[r.grade] = [];
      grouped[r.grade].push(r);
    });
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      let prev: number | null = null,
        prevRank = 0;
      arr.forEach((row, i) => {
        if (prev === null) {
          row.rank = 1;
          prev = row.totalScore;
          prevRank = 1;
        } else if (row.totalScore === prev) {
          row.rank = prevRank;
        } else {
          row.rank = i + 1;
          prev = row.totalScore;
          prevRank = row.rank;
        }
      });
    });
    setScores(updated);
  };

  const handleSaveOrUpdate = async () => {
    if (!selectedWeek || !scores.length) return;
    try {
      if (!hasData) {
        await api.post("/api/class-weekly-scores", {
          weekNumber: selectedWeek.weekNumber,
          scores,
        });
        setHasData(true);
      } else {
        await api.put("/api/class-weekly-scores", {
          weekNumber: selectedWeek.weekNumber,
          scores,
        });
      }
      setSnackbar({ open: true, message: "Đã lưu/cập nhật", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi lưu dữ liệu", severity: "error" });
    }
  };

  const handleExportExcel = () => {
    if (!scores.length) return;
    const data = scores.map((s) => ({
      Lớp: s.className,
      Khối: s.grade,
      "Học tập": s.academicScore,
      "Thưởng": s.bonusScore,
      "Vi phạm": s.violationScore,
      "Vệ sinh": s.hygieneScore,
      "Chuyên cần": s.attendanceScore,
      "Xếp hàng": s.lineUpScore,
      "Tổng nề nếp": s.totalViolation,
      "Tổng điểm": s.totalScore,
      Hạng: s.rank,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Week_${selectedWeek?.weekNumber}`);
    XLSX.writeFile(wb, `BangDiem_Tuan${selectedWeek?.weekNumber}.xlsx`);
  };

  const handleChange = (className: string, field: keyof ScoreRow, value: number) => {
    setScores((prev) =>
      prev.map((s) => (s.className === className ? { ...s, [field]: value } : s))
    );
  };

  useEffect(() => {
    if (selectedWeek) checkHasData(selectedWeek.weekNumber);
  }, [selectedWeek]);

  // group by grade
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
              Tuần {w.weekNumber} ({formatDateShort(w.startDate)} → {formatDateShort(w.endDate)})
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

        {!hasData && (
          <Button variant="contained" onClick={handleLoadData} disabled={!selectedWeek}>
            Load dữ liệu
          </Button>
        )}

        <Button variant="contained" color="secondary" onClick={handleCalculate} disabled={!scores.length}>
          Tính xếp hạng
        </Button>

        <Button variant="contained" color="success" onClick={handleSaveOrUpdate} disabled={!scores.length}>
          {hasData ? "Cập nhật" : "Lưu"}
        </Button>

        <Button variant="outlined" onClick={handleExportExcel} disabled={!scores.length}>
          Xuất Excel
        </Button>
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
                {grade === "undefined" ? `Khối chưa xác định` : `Khối ${grade}`} (
                {rows.length} lớp)
              </Typography>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Học tập</TableCell>
                      <TableCell>Thưởng</TableCell>
                      <TableCell>Vi phạm</TableCell>
                      <TableCell>Vệ sinh</TableCell>
                      <TableCell>Chuyên cần</TableCell>
                      <TableCell>Xếp hàng</TableCell>
                      <TableCell>Tổng nề nếp</TableCell>
                      <TableCell>Tổng</TableCell>
                      <TableCell>Hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      let bg = {};
                      if (r.rank === 1) bg = { backgroundColor: "rgba(255,215,0,0.25)" }; // vàng
                      else if (r.rank === 2) bg = { backgroundColor: "rgba(192,192,192,0.25)" }; // bạc
                      else if (r.rank === 3) bg = { backgroundColor: "rgba(205,127,50,0.25)" }; // đồng

                      return (
                        <TableRow key={r.className} sx={bg}>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ width: 70 }}
                              value={r.academicScore}
                              onChange={(e) =>
                                handleChange(r.className, "academicScore", Number(e.target.value))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ width: 70 }}
                              value={r.bonusScore}
                              onChange={(e) =>
                                handleChange(r.className, "bonusScore", Number(e.target.value))
                              }
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
