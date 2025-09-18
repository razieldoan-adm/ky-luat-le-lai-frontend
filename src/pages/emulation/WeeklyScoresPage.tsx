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
} from "@mui/material";
import api from "../../api/api";

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
  homeroomTeacher: string;
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

  // ---- init ----
  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

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

  // ---- load component scores from backend ----
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

      const data: ScoreRow[] = classes
        // nếu bạn chỉ muốn lớp có GVCN, uncomment dòng dưới
        // .filter(c => c.homeroomTeacher)
        .map((cls) => {
          const vItem = violations.find((x: any) => x.className === cls.className);
          const hItem = hygiene.find((x: any) => x.className === cls.className);
          const aItem = attendance.find((x: any) => x.className === cls.className);
          const lItem = lineup.find((x: any) => x.className === cls.className);

          // backend đang dùng totalScore field -> đọc totalScore
          const v = (vItem && (vItem.totalScore ?? vItem.total ?? vItem.score ?? 0)) || 0;
          const h = (hItem && (hItem.totalScore ?? hItem.total ?? hItem.score ?? 0)) || 0;
          const a = (aItem && (aItem.totalScore ?? aItem.total ?? aItem.score ?? 0)) || 0;
          const l = (lItem && (lItem.totalScore ?? lItem.total ?? lItem.score ?? 0)) || 0;

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

  // ---- calculate totals & rank PER GRADE ----
  const handleCalculate = () => {
    if (!scores.length) {
      setSnackbar({ open: true, message: "Chưa có dữ liệu để tính.", severity: "info" });
      return;
    }

    // 1) compute totals for every class
    let updated = scores.map((s) => {
      const totalViolation =
        disciplineMax - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // 2) group by grade
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      if (!grouped[r.grade]) grouped[r.grade] = [];
      grouped[r.grade].push(r);
    });

    // 3) for each grade sort by totalScore desc and assign competition rank (1,1,3...)
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      let prevScore: number | null = null;
      let prevRank = 0;
      let i = 0; // index (0-based)
      arr.forEach((row) => {
        i++;
        if (prevScore === null) {
          row.rank = 1;
          prevRank = 1;
          prevScore = row.totalScore;
        } else {
          if (row.totalScore === prevScore) {
            row.rank = prevRank; // tie -> same rank
          } else {
            row.rank = i; // competition ranking: rank = position index (1-based)
            prevRank = row.rank;
            prevScore = row.totalScore;
          }
        }
        // also update the corresponding object in updated (they are same refs)
        const idx = updated.findIndex((u) => u.className === row.className && u.grade === row.grade);
        if (idx !== -1) updated[idx] = { ...row };
      });
    });

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng theo từng khối", severity: "success" });
  };

  // ---- save weekly scores ----
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

  // ---- change handler (by className to be stable when grouped) ----
  const handleChange = (className: string, field: keyof ScoreRow, value: number) => {
    const updated = scores.map((s) => (s.className === className ? { ...s, [field]: value } : s));
    setScores(updated);
  };

  // ---- grouping for render; ensure rows shown ordered by rank (if calculated) ----
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });

  const gradeKeys = Object.keys(groupedByGrade).sort((a, b) => Number(a) - Number(b));

  const formatDateShort = (d: string) => {
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

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
          sx={{ minWidth: 200 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({formatDateShort(w.startDate)} → {formatDateShort(w.endDate)})
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
        // create sorted copy: ranked ones first by rank asc, then others by className
        const rows = (groupedByGrade[grade] || []).slice().sort((a, b) => {
          const aRank = a.rank || 9999;
          const bRank = b.rank || 9999;
          if (aRank !== bRank) return aRank - bRank; // rank ascending (1 at top)
          // if both unranked or same rank, fallback to totalScore desc
          if ((b.totalScore || 0) !== (a.totalScore || 0)) return (b.totalScore || 0) - (a.totalScore || 0);
          return a.className.localeCompare(b.className);
        });

        const topClassName = rows.length ? rows[0].className : null;

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
                      sx={r.className === topClassName ? { backgroundColor: "rgba(255,215,0,0.18)" } : {}}
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
