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
  grade?: string;
  weekNumber?: number;
  academicScore?: number;
  bonusScore?: number;
  disciplineScore?: number;
  hygieneScore?: number;
  attendanceScore?: number;
  lineUpScore?: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
  disciplineMax?: number;
}

interface ClassItem {
  _id: string;
  className: string;
  grade?: string;
  teacher?: string;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info"; }>({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
    fetchClasses();
  }, []);

  useEffect(() => {
    // reset when week changes
    setScores([]);
  }, [selectedWeek]);

  // ---------- Fetch helpers ----------
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks"); // đúng API của bạn
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Không tải được danh sách tuần.", severity: "error" });
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) setDisciplineMax(res.data.disciplineMax);
    } catch (err) {
      console.error("Lỗi settings:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes/with-teacher");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi classes:", err);
    }
  };

  // nếu backend đã lưu bảng tổng rồi -> load (giữ như trước)
  const fetchSavedWeeklyScores = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", { params: { weekNumber: selectedWeek.weekNumber } });
      // filter chỉ các lớp có GVCN (theo code gốc)
      const valid = classList.filter((c) => c.teacher && c.teacher.trim() !== "").map((c) => normalize(c.className));
      const filtered = res.data.filter((r: any) => valid.includes(normalize(r.className)));
      // ensure numeric defaults
      const list: Score[] = filtered.map((r: any) => ({
        ...r,
        bonusScore: r.bonusScore || 0,
        disciplineScore: r.disciplineScore || 0,
        hygieneScore: r.hygieneScore || 0,
        attendanceScore: r.attendanceScore || 0,
        lineUpScore: r.lineUpScore || 0,
      }));
      const computed = computeTotalsIfMissing(list);
      const ranked = assignRanksPerGrade(computed);
      setScores(ranked);
      if (filtered.length === 0) {
        setSnackbar({ open: true, message: "Chưa có dữ liệu lưu. Bấm 'Gom từ nguồn' để lấy và tính.", severity: "info" });
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Lỗi khi tải bảng tổng.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Utility: lấy số từ bản ghi (linh hoạt) ----------
  const extractNumeric = (rec: any) => {
    if (!rec || typeof rec !== "object") return 0;
    // ưu tiên các keys thường dùng
    const candidates = ["score", "value", "point", "penalty", "total", "totalScore", "totalPenalty", "count", "amount"];
    for (const k of candidates) {
      if (typeof rec[k] === "number") return rec[k];
    }
    // nếu không có keys cụ thể, cộng tất cả trường số (tránh weekNumber)
    let sum = 0;
    let found = false;
    for (const k of Object.keys(rec)) {
      if (["_id", "weekNumber"].includes(k)) continue;
      if (typeof rec[k] === "number") {
        sum += rec[k];
        found = true;
      }
    }
    return found ? sum : 0;
  };

  const normalize = (str?: string) => (str ? str.toString().trim().toUpperCase() : "");

  // ---------- Aggregate from raw collections ----------
  // NOTE: endpoint names — nếu backend khác tên, sửa các URL bên dưới.
  const aggregateFromSources = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Hãy chọn tuần trước.", severity: "info" });
      return;
    }
    setLoading(true);
    try {
      // gọi đồng thời 5 nguồn: bảng tổng (nếu có), 4 collection thô
      const [
        savedRes,
        violationRes,
        hygieneRes,
        attendanceRes,
        lineupRes,
      ] = await Promise.all([
        api.get("/api/class-weekly-scores", { params: { weekNumber: selectedWeek.weekNumber } }),
        api.get("/api/class-violation-scores", { params: { weekNumber: selectedWeek.weekNumber } }),
        api.get("/api/class-hygiene-scores", { params: { weekNumber: selectedWeek.weekNumber } }),
        api.get("/api/class-attendance-summaries", { params: { weekNumber: selectedWeek.weekNumber } }),
        api.get("/api/class-lineup-summaries", { params: { weekNumber: selectedWeek.weekNumber } }),
      ]);

      // build map of classes that have GVCN (same filter as before)
      const validClasses = classList.filter((c) => c.teacher && c.teacher.trim() !== "");
      const normToOriginal: Record<string, string> = {};
      validClasses.forEach((c) => { normToOriginal[normalize(c.className)] = c.className; });

      // initialize map with saved data or class list
      const map = new Map<string, Score>();

      // priority: prefer savedRes data if exists (it may contain academicScore/bonus)
      const savedList = Array.isArray(savedRes.data) ? savedRes.data : [];
      savedList.forEach((r: any) => {
        const n = normalize(r.className);
        if (!normToOriginal[n]) return; // chỉ quan tâm lớp valid
        map.set(n, {
          _id: r._id,
          className: r.className,
          grade: r.grade,
          weekNumber: r.weekNumber,
          academicScore: typeof r.academicScore === "number" ? r.academicScore : 0,
          bonusScore: typeof r.bonusScore === "number" ? r.bonusScore : 0,
          disciplineScore: typeof r.disciplineScore === "number" ? r.disciplineScore : 0,
          hygieneScore: typeof r.hygieneScore === "number" ? r.hygieneScore : 0,
          attendanceScore: typeof r.attendanceScore === "number" ? r.attendanceScore : 0,
          lineUpScore: typeof r.lineUpScore === "number" ? r.lineUpScore : 0,
          disciplineMax: typeof r.disciplineMax === "number" ? r.disciplineMax : disciplineMax,
        });
      });

      // ensure every valid class has an entry
      validClasses.forEach((c) => {
        const n = normalize(c.className);
        if (!map.has(n)) {
          map.set(n, {
            className: c.className,
            grade: c.grade,
            academicScore: 0,
            bonusScore: 0,
            disciplineScore: 0,
            hygieneScore: 0,
            attendanceScore: 0,
            lineUpScore: 0,
            disciplineMax: disciplineMax,
            weekNumber: selectedWeek.weekNumber,
          });
        }
      });

      // helper: add values from a list into a field on map
      const addValuesToField = (list: any[], field: keyof Score) => {
        list.forEach((rec: any) => {
          // try common field names for class
          const classNameCandidate = rec.className || rec.class || rec.classname || rec.lop || rec._class;
          const n = normalize(classNameCandidate);
          if (!map.has(n)) return; // nếu lớp không trong danh sách có gvcn thì bỏ qua
          const val = extractNumeric(rec);
          const entry = map.get(n)!;
          (entry[field] = (entry[field] || 0) + val);
        });
      };

      addValuesToField(Array.isArray(violationRes.data) ? violationRes.data : [], "disciplineScore");
      addValuesToField(Array.isArray(hygieneRes.data) ? hygieneRes.data : [], "hygieneScore");
      addValuesToField(Array.isArray(attendanceRes.data) ? attendanceRes.data : [], "attendanceScore");
      addValuesToField(Array.isArray(lineupRes.data) ? lineupRes.data : [], "lineUpScore");

      // compute totals for each class
      const list: Score[] = Array.from(map.values()).map((e) => {
        const disc = e.disciplineScore || 0;
        const hig = e.hygieneScore || 0;
        const att = e.attendanceScore || 0;
        const line = e.lineUpScore || 0;
        const max = e.disciplineMax || disciplineMax;
        const totalViolation = max - (disc + hig + att + line);
        const totalRankScore = (e.academicScore || 0) + totalViolation + (e.bonusScore || 0);
        return { ...e, totalViolation, totalRankScore };
      });

      // assign ranks by grade
      const ranked = assignRanksPerGrade(list);
      setScores(ranked);
      setSnackbar({ open: true, message: "Gom dữ liệu từ nguồn thành công.", severity: "success" });
    } catch (err) {
      console.error("Lỗi aggregateFromSources:", err);
      setSnackbar({ open: true, message: "Lỗi khi gom dữ liệu từ nguồn.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Calculation helpers ----------
  const computeTotalsIfMissing = (list: Score[]) => {
    return list.map((s) => {
      const disc = s.disciplineScore || 0;
      const hig = s.hygieneScore || 0;
      const att = s.attendanceScore || 0;
      const line = s.lineUpScore || 0;
      const max = s.disciplineMax || disciplineMax;
      const totalViolation = typeof s.totalViolation === "number" ? s.totalViolation : max - (disc + hig + att + line);
      const totalRankScore = typeof s.totalRankScore === "number" ? s.totalRankScore : (s.academicScore || 0) + totalViolation + (s.bonusScore || 0);
      return { ...s, totalViolation, totalRankScore };
    });
  };

  const assignRanksPerGrade = (list: Score[]) => {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      const g = s.grade || "unknown";
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(s);
    });
    Object.keys(byGrade).forEach((g) => {
      const sorted = [...byGrade[g]].sort((a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0));
      sorted.forEach((s, idx) => {
        const target = list.find((x) => normalize(x.className) === normalize(s.className));
        if (target) target.rank = idx + 1;
      });
    });
    return [...list];
  };

  const handleBonusChange = (id: string | undefined, value: number) => {
    if (!id) return;
    const updated = scores.map((s) => (s._id === id ? { ...s, bonusScore: value } : s));
    const withCalc = computeTotalsIfMissing(updated);
    const withRanks = assignRanksPerGrade(withCalc);
    setScores(withRanks);
  };

  const getRowStyle = (idx: number, rank?: number) => {
    let style: any = { backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9" };
    if (rank === 1) style.backgroundColor = "#ffe082";
    if (rank === 2) style.backgroundColor = "#b2ebf2";
    if (rank === 3) style.backgroundColor = "#c8e6c9";
    return style;
  };

  // ---------- UI ----------
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>📊 Điểm Thi Đua Tuần</Typography>

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
          sx={{ width: 360 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} - {new Date(w.endDate).toLocaleDateString()})
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="secondary" onClick={aggregateFromSources} disabled={!selectedWeek || loading}>
            Gom từ nguồn
          </Button>
          <Button variant="outlined" onClick={fetchSavedWeeklyScores} disabled={!selectedWeek || loading}>
            🔄 Tải dữ liệu (saved)
          </Button>
          <Button variant="outlined" color="info" onClick={handleCalculateRank} disabled={!selectedWeek || loading}>
            TÍNH XẾP HẠNG (backend)
          </Button>
          <Button variant="contained" color="success" onClick={() => {
            // lưu lại bảng tổng (sử dụng endpoint hiện có)
            (async () => { await api.post("/api/class-weekly-scores", { weekNumber: selectedWeek?.weekNumber, scores }); setSnackbar({ open: true, message: "Đã lưu", severity: "success" }); })();
          }} disabled={!selectedWeek || scores.length === 0}>
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
                <TableRow key={s._id ?? s.className} sx={getRowStyle(i, s.rank)}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.grade ?? "-"}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.bonusScore ?? 0}
                      onChange={(e) => handleBonusChange(s._id, Number(e.target.value))}
                      sx={{ width: 70, "& input": { textAlign: "center" } }}
                    />
                  </TableCell>
                  <TableCell align="center">{s.academicScore ?? "-"}</TableCell>
                  <TableCell align="center">{s.disciplineScore ?? 0}</TableCell>
                  <TableCell align="center">{s.hygieneScore ?? 0}</TableCell>
                  <TableCell align="center">{s.attendanceScore ?? 0}</TableCell>
                  <TableCell align="center">{s.lineUpScore ?? 0}</TableCell>
                  <TableCell align="center">{typeof s.totalViolation === "number" ? s.totalViolation : "-"}</TableCell>
                  <TableCell align="center">{typeof s.totalRankScore === "number" ? s.totalRankScore : "-"}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{s.rank ?? "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">Không có dữ liệu.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
