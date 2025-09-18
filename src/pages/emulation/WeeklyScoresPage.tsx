// src/pages/emulation/WeeklyScoresPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
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

interface ClassInfo {
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
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

  // ---------------- helpers ----------------
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  // Try multiple URL patterns until one returns an array
  const fetchVariants = async (base: string, weekNumber: number) => {
    const variants = [
      `${base}/week/${weekNumber}`,
      `${base}?weekNumber=${weekNumber}`,
      `${base}/temp?weekNumber=${weekNumber}`,
      `${base}`,
    ];
    for (const url of variants) {
      try {
        const res = await api.get(url);
        if (Array.isArray(res.data)) {
          console.log(`[fetchVariants] ${url} -> success, length=${res.data.length}`);
          return res.data;
        }
        // sometimes backend returns object with .data property etc. try to coerce
        if (res.data && Array.isArray((res.data as any).data)) {
          return (res.data as any).data;
        }
      } catch (e) {
        // ignore and try next
        // console.warn(`[fetchVariants] ${url} failed`, e);
      }
    }
    return [];
  };

  // Get numeric value from various possible fields
  const readNumeric = (item: any, keys: string[]) => {
    if (!item) return 0;
    for (const k of keys) {
      const v = item[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
    }
    // try nested common names
    if (item.totalScore && typeof item.totalScore === "number") return item.totalScore;
    if (item.score && typeof item.score === "number") return item.score;
    if (item.total && typeof item.total === "number") return item.total;
    return 0;
  };

  // ---------------- fetch basic data ----------------
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      // only classes that have homeroomTeacher (GVCN)
      setClasses((res.data || []).filter((c: any) => c.homeroomTeacher));
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

  // ---------------- load weekly component scores ----------------
  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần", severity: "error" });
      return;
    }

    try {
      // try multiple patterns for each endpoint
      const [violationsArr, hygieneArr, attendanceArr, lineupArr] = await Promise.all([
        fetchVariants("/api/class-violation-scores", selectedWeek.weekNumber),
        fetchVariants("/api/class-hygiene-scores", selectedWeek.weekNumber),
        fetchVariants("/api/class-attendance-summaries", selectedWeek.weekNumber),
        fetchVariants("/api/class-lineup-summaries", selectedWeek.weekNumber),
      ]);

      console.log("loaded arrays lengths:", {
        violations: violationsArr.length,
        hygiene: hygieneArr.length,
        attendance: attendanceArr.length,
        lineup: lineupArr.length,
      });

      // build normalized rows only for classes that have GVCN (we already filtered classes on fetch)
      const data: ScoreRow[] = classes.map((cls) => {
        const violationItem = violationsArr.find((x: any) => x.className === cls.className);
        const hygieneItem = hygieneArr.find((x: any) => x.className === cls.className);
        const attendanceItem = attendanceArr.find((x: any) => x.className === cls.className);
        const lineupItem = lineupArr.find((x: any) => x.className === cls.className);

        const v = readNumeric(violationItem, ["total", "score", "violationScore", "value"]);
        const h = readNumeric(hygieneItem, ["total", "score", "hygieneScore", "value"]);
        const a = readNumeric(attendanceItem, ["total", "attendanceScore", "score"]);
        const l = readNumeric(lineupItem, ["total", "lineupScore", "score"]);

        return {
          className: cls.className,
          grade: String(cls.grade),
          weekNumber: selectedWeek.weekNumber,
          academicScore: 0,
          bonusScore: 0,
          violationScore: v,
          hygieneScore: h,
          attendanceScore: a,
          lineUpScore: l,
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

  // ---------------- calculate ranks per grade ----------------
  const handleCalculate = () => {
    if (!scores.length) {
      setSnackbar({ open: true, message: "Chưa có dữ liệu để tính.", severity: "info" });
      return;
    }

    // compute totals
    const updated = scores.map((s) => {
      const totalViolation = disciplineMax - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // group by grade and rank
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      if (!grouped[r.grade]) grouped[r.grade] = [];
      grouped[r.grade].push(r);
    });

    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      arr.forEach((r, idx) => {
        r.rank = idx + 1;
      });
    });

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng theo khối", severity: "success" });
  };

  // ---------------- save (single request: { weekNumber, scores }) ----------------
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

  // safer change: find by className (unique per week)
  const handleChangeByClass = (className: string, field: keyof ScoreRow, value: number) => {
    const idx = scores.findIndex((s) => s.className === className);
    if (idx === -1) return;
    const copy = [...scores];
    (copy[idx] as any)[field] = value;
    setScores(copy);
  };

  // group current scores by grade for rendering
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });

  // sort grades naturally (numeric)
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
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ minWidth: 260 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({formatDate(w.startDate)} → {formatDate(w.endDate)})
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
      </Box>

      {gradeKeys.length === 0 && <Typography>Chưa có dữ liệu (nhấn "Gọi dữ liệu").</Typography>}

      {gradeKeys.map((grade) => {
        const rows = groupedByGrade[grade].sort((a, b) => a.className.localeCompare(b.className));
        // find top (rank 1) for highlight — if ranks not yet calculated, compute by totalScore
        const topClass = rows.reduce((best, r) => {
          if (!best) return r;
          return (r.rank && best.rank) ? (r.rank < best.rank ? r : best) : (r.totalScore > best.totalScore ? r : best);
        }, null as ScoreRow | null);

        return (
          <Box key={grade} mb={4}>
            <Typography variant="h6" gutterBottom>Khối {grade}</Typography>
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
                    <TableRow key={r.className} sx={topClass && topClass.className === r.className ? { backgroundColor: "rgba(255,215,0,0.25)" } : {}}>
                      <TableCell>{r.className}</TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          sx={{ width: 70 }}
                          value={r.academicScore}
                          onChange={(e) => handleChangeByClass(r.className, "academicScore", Number(e.target.value))}
                        />
                      </TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          sx={{ width: 70 }}
                          value={r.bonusScore}
                          onChange={(e) => handleChangeByClass(r.className, "bonusScore", Number(e.target.value))}
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
          </Box>
        );
      })}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
