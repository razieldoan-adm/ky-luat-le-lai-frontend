// src/pages/emulation/WeeklyScoresPage.tsx
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
  Stack,
} from "@mui/material";
import * as XLSX from "xlsx";
import api from "../../api/api";

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
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineupScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

// ---------- Component ----------
export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [classList, setClassList] = useState<any[]>([]);

  const [hasData, setHasData] = useState(false); // DB đã có dữ liệu cho tuần này chưa
  const [calculated, setCalculated] = useState(false); // đã tính xếp hạng ở FE chưa
  const [saved, setSaved] = useState(false); // đã lưu (sau khi tính) chưa
  const [hasChanges, setHasChanges] = useState(false); // backend check-changes báo dữ liệu gốc thay đổi

  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  // ---------- Helpers ----------
  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  const normalizeSavedScores = (arr: any[]): ScoreRow[] =>
    (arr || []).map((r: any) => ({
      className: r.className || "",
      grade: String(r.grade ?? "undefined"),
      weekNumber: Number(r.weekNumber ?? selectedWeek?.weekNumber ?? 0),
      academicScore: Number(r.academicScore ?? 0),
      bonusScore: Number(r.bonusScore ?? 0),
      violationScore: Number(r.violationScore ?? 0),
      hygieneScore: Number(r.hygieneScore ?? 0),
      attendanceScore: Number(r.attendanceScore ?? 0),
      lineupScore: Number(r.lineupScore ?? r.lineUpScore ?? 0),
      totalViolation: Number(r.totalViolation ?? 0),
      totalScore: Number(r.totalScore ?? 0),
      rank: Number(r.rank ?? r.ranking ?? 0),
    }));

  const mergeScoresWithClasses = (
    classes: any[],
    scoresArr: ScoreRow[],
    weekNumber: number
  ): ScoreRow[] => {
    return classes.map((cls) => {
      const found = scoresArr.find((s) => s.className === cls.className);
      return (
        found || {
          className: cls.className,
          grade: String(cls.grade ?? "undefined"),
          weekNumber,
          academicScore: 0,
          bonusScore: 0,
          violationScore: 0,
          hygieneScore: 0,
          attendanceScore: 0,
          lineupScore: 0,
          totalViolation: 0,
          totalScore: 0,
          rank: 0,
        }
      );
    });
  };

  // ---------- Init ----------
  useEffect(() => {
    fetchWeeks();
    fetchSettings();
    fetchClasses();
  }, []);

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
    } catch (err) {
      console.error("Lỗi lấy tuần:", err);
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

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes/with-teacher");
      setClassList(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  // ---------- Load tuần (từ DB) và check thay đổi ----------
  const loadWeekData = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber },
      });
      const existing = normalizeSavedScores(res.data || []);
      if (existing.length > 0) {
        const merged = mergeScoresWithClasses(classList, existing, weekNumber);
        setScores(merged);
        setHasData(true);
        setCalculated(merged.some((s) => s.rank > 0));
        setSaved(true);

        // check backend xem dữ liệu gốc (attendance/hygiene/...) có thay đổi hay không
        try {
          const check = await api.get(
            `/api/class-weekly-scores/check-changes/${weekNumber}`
          );
          setHasChanges(Boolean(check.data?.changed));
        } catch (err) {
          console.error("Lỗi checkChanges:", err);
          setHasChanges(false);
        }
      } else {
        // không có dữ liệu đã lưu -> rỗng (cho phép load temp)
        setScores([]);
        setHasData(false);
        setCalculated(false);
        setSaved(false);
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Load tuần lỗi:", err);
      setScores([]);
      setHasData(false);
      setCalculated(false);
      setSaved(false);
      setHasChanges(false);
    }
  };

  // chạy khi đổi tuần hoặc classList được nạp
  useEffect(() => {
    if (selectedWeek) {
      loadWeekData(selectedWeek.weekNumber);
    } else {
      setScores([]);
      setHasData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, classList]);

  // ---------- Actions ----------
  // Load dữ liệu tạm (tính từ các bảng gốc) — gọi backend temp để lấy aggregation
  const handleLoadData = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/api/class-weekly-scores/temp", {
        params: { weekNumber: selectedWeek.weekNumber },
      });
      const temp = normalizeSavedScores(res.data || []);
      const merged = mergeScoresWithClasses(classList, temp, selectedWeek.weekNumber);
      // khi load temp: chưa lưu, chưa tính (người dùng sẽ click tính)
      setScores(merged);
      setHasData(false);
      setCalculated(false);
      setSaved(false);
      setHasChanges(false);
    } catch (err) {
      console.error("Load dữ liệu tạm lỗi:", err);
    }
  };

  // Tính xếp hạng trên FE
  const handleCalculate = () => {
    if (!scores.length) return;
    const updated = scores.map((s) => {
      const totalViolation =
        disciplineMax -
        (s.violationScore + s.hygieneScore + s.attendanceScore * 5 + s.lineupScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // xếp hạng theo khối
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
    setCalculated(true);
    setSaved(false); // chưa lưu sau khi tính
    // note: hasChanges indicates server-side raw-data change; giữ nguyên
  };

  // Lưu (ghi đè hoặc tạo mới) — sử dụng endpoint save (upsert)
  const handleSave = async () => {
    if (!selectedWeek || !scores.length) return;
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });

      // load lại từ DB để đảm bảo đồng bộ
      await loadWeekData(selectedWeek.weekNumber);

      setSnackbar({
        open: true,
        message: "Đã lưu dữ liệu & xếp hạng",
        severity: "success",
      });
      setSaved(true);
      setHasChanges(false);
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi lưu dữ liệu",
        severity: "error",
      });
    }
  };

  // Cập nhật lại từ dữ liệu gốc (backend sẽ tính + merge điểm nhập tay nếu có)
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    try {
      await api.post(`/api/class-weekly-scores/update/${selectedWeek.weekNumber}`);
      // sau khi update backend đã upsert -> load lại dữ liệu đã lưu
      await loadWeekData(selectedWeek.weekNumber);

      setSnackbar({
        open: true,
        message: "Đã cập nhật từ dữ liệu gốc. Vui lòng tính lại xếp hạng nếu muốn.",
        severity: "info",
      });
      // sau update, frontend có thể tính lại (người dùng nhấn Tính xếp hạng) hoặc bạn có thể để backend đã xếp hạng
    } catch (err) {
      console.error("Update error:", err);
      setSnackbar({
        open: true,
        message: "Lỗi cập nhật dữ liệu từ nguồn gốc",
        severity: "error",
      });
    }
  };

  // Export Excel
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
      "Xếp hàng": s.lineupScore,
      "Tổng nề nếp": s.totalViolation,
      "Tổng điểm": s.totalScore,
      Hạng: s.rank,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Week_${selectedWeek?.weekNumber}`);
    XLSX.writeFile(wb, `BangDiem_Tuan${selectedWeek?.weekNumber}.xlsx`);
  };

  // Khi người dùng chỉnh tay Học tập / Thưởng
  const handleChange = (className: string, field: keyof ScoreRow, value: number) => {
    setScores((prev) => prev.map((s) => (s.className === className ? { ...s, [field]: value } : s)));
    setCalculated(false);
    setSaved(false);
    // chỉnh tay -> coi như đã khác với DB => bật tùy chọn lưu (hasChanges here marks local edit)
    setHasChanges(true);
  };

  // ---------- Render ----------
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
          onChange={(e) => setSelectedWeek(weeks.find((w) => w._id === e.target.value) || null)}
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
          <Select value={gradeFilter} label="Khối" onChange={(e) => setGradeFilter(e.target.value)}>
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="6">Khối 6</MenuItem>
            <MenuItem value="7">Khối 7</MenuItem>
            <MenuItem value="8">Khối 8</MenuItem>
            <MenuItem value="9">Khối 9</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2}>
          {!hasData && (
            <Button variant="contained" color="info" onClick={handleLoadData} disabled={!selectedWeek}>
              Load dữ liệu
            </Button>
          )}

          {hasData && !calculated && (
            <Button variant="contained" color="secondary" onClick={handleCalculate} disabled={!scores.length}>
              Tính xếp hạng
            </Button>
          )}

          {hasData && calculated && !saved && (
            <Button variant="contained" color="success" onClick={handleSave} disabled={!scores.length}>
              Lưu
            </Button>
          )}

          {hasData && saved && !hasChanges && (
            <Button variant="outlined" disabled>
              Đã lưu
            </Button>
          )}

          {/* Nếu backend báo thay đổi gốc (ví dụ do cập nhật attendance/hygiene), bật nút Cập nhật */}
          {hasData && hasChanges && saved && (
            <Button variant="contained" color="warning" onClick={handleUpdate}>
              Cập nhật
            </Button>
          )}

          <Button variant="outlined" onClick={handleExportExcel} disabled={!scores.length}>
            Xuất Excel
          </Button>
        </Stack>
      </Box>

      {/* Bảng theo khối */}
      {gradeKeys
        .filter((g) => gradeFilter === "all" || g === gradeFilter)
        .map((grade) => {
          const rows = groupedByGrade[grade].slice().sort((a, b) => a.className.localeCompare(b.className));
          return (
            <Box key={grade} mb={4}>
              <Typography variant="h6" gutterBottom>
                {grade === "undefined" ? "Khối chưa xác định" : `Khối ${grade}`} ({rows.length} lớp)
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
                      if (r.rank === 1) bg = { backgroundColor: "rgba(255,215,0,0.25)" };
                      else if (r.rank === 2) bg = { backgroundColor: "rgba(192,192,192,0.25)" };
                      else if (r.rank === 3) bg = { backgroundColor: "rgba(205,127,50,0.25)" };

                      return (
                        <TableRow key={r.className} sx={bg}>
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
                          <TableCell>{r.lineupScore}</TableCell>
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

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
