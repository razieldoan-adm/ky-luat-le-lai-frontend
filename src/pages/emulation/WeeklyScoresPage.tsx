import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";
import ExcelJS from "exceljs";

type Week = {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
};

type ClassInfo = {
  _id: string;
  className: string;
  grade: string; // e.g. '6', '7', ...
};

type RawScoreFromDB = {
  _id?: string;
  className: string;
  grade?: string;
  academicScore?: number;
  disciplineScore?: number;
  violationScore?: number;
  hygieneScore?: number;
  attendanceScore?: number;
  diligenceScore?: number;
  lineUpScore?: number;
  lineUp?: number;
  bonusScore?: number;
  totalScore?: number;
  rank?: number;
};

type Score = {
  _id?: string;
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;    // = disciplineMax - (discipline + lineUp + hygiene + attendance)
  totalRankScore: number;    // = academic + totalViolation + bonus
  rank: number;
};

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [edited, setEdited] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // --- init: load classes + settings + weeks
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clsRes, setRes, weeksRes] = await Promise.allSettled([
          api.get("/api/classes"),
          api.get("/api/settings"),
          api.get("/api/academic-weeks/study-weeks"),
        ]);

        // classes
        if (clsRes.status === "fulfilled") {
          const data = clsRes.value?.data;
          setClasses(Array.isArray(data) ? data : []);
        } else {
          setClasses([]);
          console.error("Lỗi load classes:", clsRes.reason);
        }

        // settings
        if (setRes.status === "fulfilled") {
          const data = setRes.value?.data;
          if (data && typeof data.disciplineMax === "number") setDisciplineMax(data.disciplineMax);
          else setDisciplineMax(100);
        } else {
          setDisciplineMax(100);
          console.error("Lỗi load settings:", setRes.reason);
        }

        // weeks
        if (weeksRes.status === "fulfilled") {
          const data = weeksRes.value?.data;
          const arr = Array.isArray(data) ? data : [];
          setWeeks(arr);
          if (arr.length > 0) {
            setSelectedWeek((prev) => prev ?? arr[0]);
          }
        } else {
          setWeeks([]);
          console.error("Lỗi load weeks:", weeksRes.reason);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // whenever selectedWeek or classes change, fetch and merge scores
  useEffect(() => {
    if (!selectedWeek) return;
    if (classes.length === 0) {
      // wait until classes loaded
      return;
    }
    fetchAndMergeScores(selectedWeek.weekNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, classes, disciplineMax]);

  // fetch scores from DB and merge with classes list so every class appears
  async function fetchAndMergeScores(weekNumber: number) {
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", { params: { weekNumber } });
      const db = res?.data;
      const rawScores: RawScoreFromDB[] = Array.isArray(db) ? db : [];

      // build lookup by className
      const lookup = new Map<string, RawScoreFromDB>();
      rawScores.forEach((r) => lookup.set(r.className, r));

      // merge
      const merged: Score[] = classes.map((c) => {
        const r = lookup.get(c.className);
        const academicScore = Number(r?.academicScore ?? 0);
        const disciplineScore = Number(r?.disciplineScore ?? r?.violationScore ?? 0);
        const hygieneScore = Number(r?.hygieneScore ?? 0);
        const attendanceScore = Number(r?.attendanceScore ?? r?.diligenceScore ?? 0);
        const lineUpScore = Number(r?.lineUpScore ?? r?.lineUp ?? 0);
        const bonusScore = Number(r?.bonusScore ?? 0);

        const totalViolation = calculateTotalViolation(disciplineScore, hygieneScore, attendanceScore, lineUpScore);
        const totalRankScore = calculateTotalRankScore(academicScore, bonusScore, totalViolation);

        return {
          _id: r?._id,
          className: c.className,
          grade: c.grade,
          academicScore,
          bonusScore,
          disciplineScore,
          hygieneScore,
          attendanceScore,
          lineUpScore,
          totalViolation,
          totalRankScore,
          rank: 0,
        };
      });

      const ranked = assignRanksPerGrade(merged);
      setScores(ranked);
      setEdited(false);
      if (rawScores.length === 0) {
        setSnack({ open: true, message: "Chưa có dữ liệu tuần này. Bạn có thể nhập Điểm thưởng và bấm Lưu.", severity: "info" });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
      // fallback: show classes with zeros
      const fallback = classes.map((c) => ({
        className: c.className,
        grade: c.grade,
        academicScore: 0,
        bonusScore: 0,
        disciplineScore: 0,
        hygieneScore: 0,
        attendanceScore: 0,
        lineUpScore: 0,
        totalViolation: 0,
        totalRankScore: 0,
        rank: 0,
      } as Score));
      setScores(assignRanksPerGrade(fallback));
    } finally {
      setLoading(false);
    }
  }

  // formulas
  function calculateTotalViolation(discipline: number, hygiene: number, attendance: number, lineUp: number) {
    // requested: totalViolation = disciplineMax - (discipline + xep hang + ve sinh + chuyen can)
    // here "xếp hàng" is lineUpScore
    return disciplineMax - (discipline + lineUp + hygiene + attendance);
  }
  function calculateTotalRankScore(academic: number, bonus: number, totalViolation: number) {
    // total xếp hạng = academic + totalViolation + bonus
    return academic + totalViolation + bonus;
  }

  // rank per grade
  function assignRanksPerGrade(list: Score[]) {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });
    Object.keys(byGrade).forEach((g) => {
      byGrade[g].sort((a, b) => b.totalRankScore - a.totalRankScore);
      byGrade[g].forEach((s, idx) => {
        s.rank = idx + 1;
      });
    });
    // flatten in grade order (numeric sort)
    const grades = Object.keys(byGrade).sort((a, b) => Number(a) - Number(b));
    const flat: Score[] = [];
    grades.forEach((g) => flat.push(...byGrade[g]));
    return flat;
  }

  // inline change bonus
  function onBonusChange(className: string, value: number) {
    setScores((prev) => {
      const next = prev.map((s) => {
        if (s.className !== className) return s;
        const bonus = Number.isFinite(value) ? value : 0;
        const totalViolation = calculateTotalViolation(s.disciplineScore, s.hygieneScore, s.attendanceScore, s.lineUpScore);
        const totalRankScore = calculateTotalRankScore(s.academicScore, bonus, totalViolation);
        return { ...s, bonusScore: bonus, totalViolation, totalRankScore };
      });
      return assignRanksPerGrade(next);
    });
    setEdited(true);
  }

  // Save to backend
  async function handleSave() {
    if (!selectedWeek) {
      setSnack({ open: true, message: "Chưa chọn tuần.", severity: "error" });
      return;
    }
    try {
      const payload = {
        weekNumber: selectedWeek.weekNumber,
        scores: scores.map((s) => ({
          className: s.className,
          grade: s.grade,
          academicScore: s.academicScore,
          bonusScore: s.bonusScore,
          disciplineScore: s.disciplineScore,
          hygieneScore: s.hygieneScore,
          attendanceScore: s.attendanceScore,
          lineUpScore: s.lineUpScore,
          totalViolation: s.totalViolation,
          totalScore: s.totalRankScore,
          rank: s.rank,
        })),
      };
      await api.post("/api/class-weekly-scores", payload);
      setEdited(false);
      setSnack({ open: true, message: "Đã lưu dữ liệu tuần thành công!", severity: "success" });
      // refresh to get IDs if inserted
      fetchAndMergeScores(selectedWeek.weekNumber);
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnack({ open: true, message: "Lưu thất bại.", severity: "error" });
    }
  }

  // recompute using current disciplineMax (button)
  function recompute() {
    const recomputed = scores.map((s) => {
      const totalViolation = calculateTotalViolation(s.disciplineScore, s.hygieneScore, s.attendanceScore, s.lineUpScore);
      const totalRankScore = calculateTotalRankScore(s.academicScore, s.bonusScore, totalViolation);
      return { ...s, totalViolation, totalRankScore };
    });
    setScores(assignRanksPerGrade(recomputed));
    setSnack({ open: true, message: "Đã tính lại tổng & xếp hạng.", severity: "success" });
  }

  // Export to Excel
  async function handleExport() {
    if (!selectedWeek) {
      setSnack({ open: true, message: "Chưa chọn tuần.", severity: "error" });
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Thi đua tuần");

    sheet.mergeCells("A1:K1");
    sheet.getCell("A1").value = "LIÊN ĐỘI THCS LÊ LAI";
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:K2");
    sheet.getCell("A2").value = `BẢNG XẾP LOẠI THI ĐUA (TUẦN ${selectedWeek.weekNumber})`;
    sheet.getCell("A2").alignment = { horizontal: "center" };

    // header (flatten - don't replicate the multirow excel header for simplicity)
    sheet.addRow([]);
    sheet.addRow([
      "STT",
      "Lớp",
      "Học tập",
      "Kỷ luật",
      "Vệ sinh",
      "Chuyên cần",
      "Xếp hàng",
      "Tổng điểm nề nếp",
      "Điểm thưởng",
      "Tổng xếp hạng",
      "Xếp hạng",
    ]);

    // group and write
    const byGrade: Record<string, Score[]> = {};
    scores.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });
    const grades = Object.keys(byGrade).sort((a, b) => Number(a) - Number(b));
    grades.forEach((grade) => {
      byGrade[grade].forEach((s, idx) => {
        sheet.addRow([
          idx + 1,
          s.className,
          s.academicScore,
          s.disciplineScore,
          s.hygieneScore,
          s.attendanceScore,
          s.lineUpScore,
          s.totalViolation,
          s.bonusScore,
          s.totalRankScore,
          s.rank,
        ]);
      });
    });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThiDua_Tuan${selectedWeek.weekNumber}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // render grouped table by grade with header grouping "Nề nếp"
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        🏆 Kết quả thi đua toàn trường theo tuần
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Chọn tuần</InputLabel>
          <Select
            value={selectedWeek?._id ?? ""}
            label="Chọn tuần"
            onChange={(e) => {
              const weekId = e.target.value as string;
              const wk = weeks.find((w) => w._id === weekId) || null;
              setSelectedWeek(wk);
            }}
          >
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w._id}>
                Tuần {w.weekNumber}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={() => selectedWeek && fetchAndMergeScores(selectedWeek.weekNumber)}>
          🔄 Tải dữ liệu
        </Button>

        <Button variant="contained" color="warning" onClick={recompute}>
          ➕ Tính tổng & xếp hạng
        </Button>

        <Button variant="contained" color="success" onClick={handleSave} disabled={!edited}>
          💾 Lưu
        </Button>

        <Button variant="contained" color="primary" onClick={handleExport}>
          📤 Xuất Excel
        </Button>

        <Box sx={{ ml: 2 }}>
          <Typography variant="body2">disciplineMax: {disciplineMax}</Typography>
        </Box>
      </Stack>

      <Typography variant="subtitle1" gutterBottom>
        Tổng số lớp: {scores.length}
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        (() => {
          // group again for render
          const grouped: Record<string, Score[]> = {};
          scores.forEach((s) => {
            if (!grouped[s.grade]) grouped[s.grade] = [];
            grouped[s.grade].push(s);
          });
          const grades = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
          return grades.map((grade) => (
            <Box key={grade} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, mt: 1, fontWeight: "bold", color: "#1976d2" }}>
                Khối {grade}
              </Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell rowSpan={2} align="center">STT</TableCell>
                      <TableCell rowSpan={2} align="center">Lớp</TableCell>
                      <TableCell rowSpan={2} align="center">Học tập</TableCell>
                      <TableCell colSpan={4} align="center">Nề nếp</TableCell>
                      <TableCell rowSpan={2} align="center">Tổng điểm Nề nếp</TableCell>
                      <TableCell rowSpan={2} align="center">Điểm thưởng</TableCell>
                      <TableCell rowSpan={2} align="center">Tổng xếp hạng</TableCell>
                      <TableCell rowSpan={2} align="center">Xếp hạng</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center">Kỷ luật</TableCell>
                      <TableCell align="center">Vệ sinh</TableCell>
                      <TableCell align="center">Chuyên cần</TableCell>
                      <TableCell align="center">Xếp hàng</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {grouped[grade]
                      .sort((a, b) => a.rank - b.rank)
                      .map((cls, idx) => (
                        <TableRow
                          key={cls.className}
                          sx={{
                            backgroundColor: cls.rank === 1 ? "#fff59d" : undefined,
                            fontWeight: cls.rank === 1 ? "bold" : undefined,
                          }}
                        >
                          <TableCell align="center">{cls.rank}</TableCell>
                          <TableCell align="center">{cls.className}</TableCell>
                          <TableCell align="center">{cls.academicScore}</TableCell>

                          <TableCell align="center">{cls.disciplineScore}</TableCell>
                          <TableCell align="center">{cls.hygieneScore}</TableCell>
                          <TableCell align="center">{cls.attendanceScore}</TableCell>
                          <TableCell align="center">{cls.lineUpScore}</TableCell>

                          <TableCell align="center">{cls.totalViolation}</TableCell>

                          {/* editable bonus */}
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={cls.bonusScore}
                              onChange={(e) => onBonusChange(cls.className, Number(e.target.value))}
                              sx={{ width: 90 }}
                            />
                          </TableCell>

                          <TableCell align="center">{cls.totalRankScore}</TableCell>
                          <TableCell align="center">{cls.rank}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ));
        })()
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity as any}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
