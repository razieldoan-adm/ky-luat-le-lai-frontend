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
  grade: string;
};

type RawScoreFromDB = {
  _id?: string;
  className: string;
  grade: string;
  academicScore?: number;
  // DB might use disciplineScore or violationScore name; support both
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
  totalViolation: number;
  totalScore: number;
  rank: number;
};

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [edited, setEdited] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    initAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initAll() {
    setLoading(true);
    try {
      await Promise.all([fetchWeeks(), fetchClasses(), fetchSettings()]);
      // after weeks loaded, set selectedWeek if not set
      if (!selectedWeek && weeks.length > 0) {
        // we can't rely on weeks state immediately here (setWeeks async) => refetch weeks again below
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeeks() {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const data = res?.data;
      setWeeks(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedWeek) {
        setSelectedWeek(data[0]);
        // fetch scores for first week
        fetchAndMergeScores(data[0].weekNumber);
      }
    } catch (err) {
      console.error("Lỗi khi lấy weeks:", err);
      setWeeks([]);
    }
  }

  async function fetchClasses() {
    try {
      const res = await api.get("/api/classes");
      const data = res?.data;
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi khi lấy classes:", err);
      setClasses([]);
    }
  }

  async function fetchSettings() {
    try {
      const res = await api.get("/api/settings");
      const data = res?.data;
      if (data && typeof data.disciplineMax === "number") setDisciplineMax(data.disciplineMax);
      else setDisciplineMax(100);
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
      setDisciplineMax(100);
    }
  }

  // fetch scores from DB and merge with classes (so missing classes still show)
  async function fetchAndMergeScores(weekNumber: number) {
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", { params: { weekNumber } });
      const db = res?.data;
      const rawScores: RawScoreFromDB[] = Array.isArray(db) ? db : [];

      // create lookup by className
      const lookup = new Map<string, RawScoreFromDB>();
      rawScores.forEach((r) => lookup.set(r.className, r));

      // merge with classes list to ensure all classes appear
      const merged: Score[] = classes.map((c) => {
        const r = lookup.get(c.className);
        const academicScore = Number(r?.academicScore ?? 0);
        const disciplineScore = Number(r?.disciplineScore ?? r?.violationScore ?? 0);
        const hygieneScore = Number(r?.hygieneScore ?? 0);
        const attendanceScore = Number(r?.attendanceScore ?? r?.diligenceScore ?? 0);
        const lineUpScore = Number(r?.lineUpScore ?? r?.lineUp ?? 0);
        const bonusScore = Number(r?.bonusScore ?? 0);

        const totalViolation = calculateTotalViolation(disciplineScore, hygieneScore, attendanceScore, lineUpScore);
        const totalScore = calculateTotalScore(academicScore, bonusScore, totalViolation);

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
          totalScore,
          rank: 0,
        };
      });

      // compute ranks per grade
      const ranked = assignRanksPerGrade(merged);
      setScores(ranked);
      setEdited(false);
      if (rawScores.length === 0) {
        setSnack({ open: true, message: "Chưa có dữ liệu tuần này. Bạn có thể nhập Điểm thưởng và lưu.", severity: "info" });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
      // if error, still show classes with zeros
      const merged = classes.map((c) => {
        return {
          className: c.className,
          grade: c.grade,
          academicScore: 0,
          bonusScore: 0,
          disciplineScore: 0,
          hygieneScore: 0,
          attendanceScore: 0,
          lineUpScore: 0,
          totalViolation: 0,
          totalScore: 0,
          rank: 0,
        } as Score;
      });
      setScores(assignRanksPerGrade(merged));
    } finally {
      setLoading(false);
    }
  }

  // formula per your requirement
  function calculateTotalViolation(disciplineScore: number, hygiene: number, attendance: number, lineUp: number) {
    // totalViolation = (disciplineMax - disciplineScore) + hygiene + attendance + lineUp
    return (disciplineMax - disciplineScore) + hygiene + attendance + lineUp;
  }

  function calculateTotalScore(academicScore: number, bonusScore: number, totalViolation: number) {
    return academicScore + bonusScore + totalViolation;
  }

  function assignRanksPerGrade(list: Score[]) {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });
    Object.keys(byGrade).forEach((g) => {
      byGrade[g].sort((a, b) => b.totalScore - a.totalScore);
      byGrade[g].forEach((s, idx) => {
        s.rank = idx + 1;
      });
    });
    // flatten preserving group order by grade ascending
    const grades = Object.keys(byGrade).sort((a, b) => Number(a) - Number(b));
    const flat: Score[] = [];
    grades.forEach((g) => flat.push(...byGrade[g]));
    return flat;
  }

  // when user changes bonus for a class
  function onBonusChange(className: string, newVal: number) {
    const next = scores.map((s) => {
      if (s.className !== className) return s;
      const bonusScore = Number.isFinite(newVal) ? newVal : 0;
      const totalViolation = calculateTotalViolation(s.disciplineScore, s.hygieneScore, s.attendanceScore, s.lineUpScore);
      const totalScore = calculateTotalScore(s.academicScore, bonusScore, totalViolation);
      return { ...s, bonusScore, totalViolation, totalScore };
    });
    const ranked = assignRanksPerGrade(next);
    setScores(ranked);
    setEdited(true);
  }

  async function handleSave() {
    if (!selectedWeek) {
      setSnack({ open: true, message: "Chưa chọn tuần.", severity: "error" });
      return;
    }
    try {
      // prepare payload: we send full scores array (server upserts by className + weekNumber)
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
          totalScore: s.totalScore,
          rank: s.rank,
        })),
      };
      await api.post("/api/class-weekly-scores", payload);
      setEdited(false);
      setSnack({ open: true, message: "Đã lưu dữ liệu tuần thành công!", severity: "success" });
      // optionally re-fetch to sync ids
      fetchAndMergeScores(selectedWeek.weekNumber);
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnack({ open: true, message: "Lưu thất bại.", severity: "error" });
    }
  }

  // export excel with new columns
  async function handleExport() {
    if (!selectedWeek) {
      setSnack({ open: true, message: "Chưa chọn tuần.", severity: "error" });
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bảng xếp loại");

    sheet.mergeCells("A1:K1");
    sheet.getCell("A1").value = "LIÊN ĐỘI THCS LÊ LAI";
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.mergeCells("A2:K2");
    sheet.getCell("A2").value = `BẢNG XẾP LOẠI THI ĐUA (TUẦN ${selectedWeek.weekNumber})`;
    sheet.getCell("A2").alignment = { horizontal: "center" };

    // header with Nề nếp grouped
    sheet.addRow([]);
    const headers = [
      "STT",
      "Lớp",
      "Học tập",
      "Kỷ luật",
      "Vệ sinh",
      "Chuyên cần",
      "Xếp hàng",
      "Tổng điểm Nề nếp",
      "Điểm thưởng",
      "Tổng",
      "Xếp hạng",
    ];
    sheet.addRow(headers);

    // flat grouped by grade
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
          s.totalScore,
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
              if (wk) fetchAndMergeScores(wk.weekNumber);
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

        <Button
          variant="contained"
          color="warning"
          onClick={() => {
            // recalc using current disciplineMax (useful if settings changed externally)
            const recomputed = scores.map((s) => {
              const tv = calculateTotalViolation(s.disciplineScore, s.hygieneScore, s.attendanceScore, s.lineUpScore);
              const ts = calculateTotalScore(s.academicScore, s.bonusScore, tv);
              return { ...s, totalViolation: tv, totalScore: ts };
            });
            setScores(assignRanksPerGrade(recomputed));
            setSnack({ open: true, message: "Đã tính lại tổng & xếp hạng.", severity: "success" });
          }}
        >
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
        // render grouped tables similar to your sample
        (() => {
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
                      <TableCell rowSpan={2} align="center">Tổng</TableCell>
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
                      .sort((a, b) => a.rank - b.rank) // ensure rank order
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
                          <TableCell align="center">{cls.totalScore}</TableCell>

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
