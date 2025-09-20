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
  Stack,
} from "@mui/material";
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
  grade: string; // lưu dạng string để tương thích
  homeroomTeacher?: string;
}

interface ScoreRow {
  className: string;
  grade: string; // grade as string like "6","7",...
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
  const [hasData, setHasData] = useState<boolean>(false); // tuần đó đã có data trong class-weekly-scores?
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // ---------- HELPERS ----------
  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  // cố gắng lấy grade từ className hoặc từ classes state
  const resolveGrade = (className: string): string => {
    // tìm trong classes nếu có
    const cls = classes.find((c) => c.className === className);
    if (cls && (cls.grade ?? "").toString().trim() !== "") return String(cls.grade);
    // parse số đầu trong className: "6A1" -> "6"
    const m = className && String(className).match(/^(\d+)/);
    if (m) return m[1];
    return "undefined";
  };

  // chuẩn hóa dữ liệu tuần lấy từ DB (các format khác nhau)
  const normalizeSavedScores = (arr: any[]): ScoreRow[] => {
    return (arr || []).map((r: any) => {
      const className = r.className || r.class || r.class_name || "";
      const grade = String(r.grade ?? resolveGrade(className) ?? "undefined");
      const weekNumber = Number(r.weekNumber ?? r.week ?? (selectedWeek?.weekNumber ?? 0));
      return {
        className,
        grade,
        weekNumber,
        academicScore: Number(r.academicScore ?? r.studyScore ?? 0),
        bonusScore: Number(r.bonusScore ?? r.bonus ?? 0),
        violationScore: Number(r.violationScore ?? r.violation ?? r.v ?? 0),
        hygieneScore: Number(r.hygieneScore ?? r.hygiene ?? 0),
        attendanceScore: Number(r.attendanceScore ?? r.attendance ?? 0),
        lineUpScore: Number(r.lineUpScore ?? r.lineUp ?? r.lineup ?? 0),
        totalViolation: Number(r.totalViolation ?? 0),
        totalScore: Number(r.totalScore ?? r.total ?? 0),
        rank: Number(r.rank ?? 0),
      };
    });
  };

  // ---------- FETCH INIT ----------
  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

  const fetchWeeks = async () => {
    try {
      // endpoint linh hoạt: bạn dùng /api/academic-weeks/study-weeks (theo trước đó)
      const res = await api.get("/api/academic-weeks/study-weeks");
      console.log("Weeks API raw:", res.data);
      const normalized: Week[] = (res.data || []).map((w: any, idx: number) => ({
        _id: w._id || w.id || String(idx),
        weekNumber: Number(w.weekNumber ?? w.week ?? idx + 1),
        startDate: w.startDate || w.start || "",
        endDate: w.endDate || w.end || "",
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

  // ---------- CHECK / LOAD EXISTING WEEKLY SCORES ----------
  const checkHasData = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores", { params: { weekNumber } });
      const existing = res.data || [];
      if (Array.isArray(existing) && existing.length > 0) {
        // đã có dữ liệu -> tự động load lên UI
        setHasData(true);
        const normalized = normalizeSavedScores(existing);
        setScores(normalized);
        console.log(`Tuần ${weekNumber} đã có ${existing.length} bản ghi trong class-weekly-scores.`);
      } else {
        // chưa có dữ liệu
        setHasData(false);
        setScores([]); // reset
        console.log(`Tuần ${weekNumber} chưa có dữ liệu weekly.`);
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra dữ liệu tuần:", err);
      setHasData(false);
      setScores([]);
    }
  };

  // ---------- LOAD component scores (violation/hygiene/attendance/lineup) - dùng khi tuần chưa có dữ liệu ----------
  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần", severity: "error" });
      return;
    }

    try {
      const weekNum = selectedWeek.weekNumber;
      const [violationsRes, hygieneRes, attendanceRes, lineupRes] = await Promise.all([
        api.get("/api/class-violation-scores", { params: { weekNumber: weekNum } }),
        api.get("/api/class-hygiene-scores", { params: { weekNumber: weekNum } }),
        api.get("/api/class-attendance-summaries", { params: { weekNumber: weekNum } }),
        api.get("/api/class-lineup-summaries", { params: { weekNumber: weekNum } }),
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

        const v = (vItem && (vItem.totalScore ?? vItem.total ?? vItem.score ?? 0)) || 0;
        const h = (hItem && (hItem.totalScore ?? hItem.total ?? hItem.score ?? 0)) || 0;
        const a = (aItem && (aItem.totalScore ?? aItem.total ?? aItem.score ?? 0)) || 0;
        const l = (lItem && (lItem.totalScore ?? lItem.total ?? lItem.score ?? 0)) || 0;

        return {
          className: cls.className,
          grade: String(cls.grade ?? resolveGrade(cls.className)),
          weekNumber: selectedWeek!.weekNumber,
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
      console.error("Lỗi khi load dữ liệu:", err);
      setSnackbar({ open: true, message: "Lỗi khi load dữ liệu", severity: "error" });
    }
  };

  // ---------- CALCULATE totals & rank per grade ----------
  const handleCalculate = () => {
    if (!scores.length) {
      setSnackbar({ open: true, message: "Chưa có dữ liệu để tính.", severity: "info" });
      return;
    }

    // compute totals
    let updated: ScoreRow[] = scores.map((s) => {
      const totalViolation = disciplineMax - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // group by grade (string)
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      const g = r.grade ?? resolveGrade(r.className) ?? "undefined";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(r);
    });

    // for each grade sort and assign competition ranking (1,1,3...)
    Object.values(grouped).forEach((arr) => {
      arr.sort((a: ScoreRow, b: ScoreRow) => b.totalScore - a.totalScore);
      let prevScore: number | null = null;
      let prevRank = 0;
      let i = 0;
      arr.forEach((row) => {
        i++;
        if (prevScore === null) {
          row.rank = 1;
          prevRank = 1;
          prevScore = row.totalScore;
        } else {
          if (row.totalScore === prevScore) {
            row.rank = prevRank;
          } else {
            row.rank = i;
            prevRank = row.rank;
            prevScore = row.totalScore;
          }
        }
        const idx = updated.findIndex((u) => u.className === row.className && u.grade === row.grade);
        if (idx !== -1) updated[idx] = { ...row };
      });
    });

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng theo từng khối", severity: "success" });
  };

  // ---------- SAVE (POST tạo mới) hoặc UPDATE (PUT ghi đè) ----------
  const handleSaveOrUpdate = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Chọn tuần trước khi lưu", severity: "error" });
      return;
    }

    try {
      if (!scores.length) {
        setSnackbar({ open: true, message: "Không có dữ liệu để lưu", severity: "info" });
        return;
      }

      if (!hasData) {
        // tạo mới
        await api.post("/api/class-weekly-scores", {
          weekNumber: selectedWeek.weekNumber,
          scores,
        });
        setHasData(true);
        setSnackbar({ open: true, message: "Đã lưu dữ liệu tuần (tạo mới)", severity: "success" });
      } else {
        // cập nhật (ghi đè)
        await api.put("/api/class-weekly-scores", {
          weekNumber: selectedWeek.weekNumber,
          scores,
        });
        setSnackbar({ open: true, message: "Đã cập nhật dữ liệu tuần (ghi đè)", severity: "success" });
      }
    } catch (err) {
      console.error("Lỗi khi lưu/cập nhật:", err);
      setSnackbar({ open: true, message: "Lưu thất bại", severity: "error" });
    }
  };

  // ---------- change handler for numeric fields ----------
  const handleChange = (className: string, field: keyof ScoreRow, value: number) => {
    const updated = scores.map((s) => (s.className === className ? { ...s, [field]: value } : s));
    setScores(updated);
  };

  // ---------- on select tuần: check và load nếu có ----------
  useEffect(() => {
    if (!selectedWeek) return;
    checkHasData(selectedWeek.weekNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  // ---------- grouping for render ----------
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    const g = s.grade ?? resolveGrade(s.className) ?? "undefined";
    if (!groupedByGrade[g]) groupedByGrade[g] = [];
    groupedByGrade[g].push(s);
  });

  const gradeKeys = Object.keys(groupedByGrade).sort((a, b) => {
    const na = isNaN(Number(a)) ? 999 : Number(a);
    const nb = isNaN(Number(b)) ? 999 : Number(b);
    return na - nb;
  });

  // ---------- RENDER ----------
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
          sx={{ minWidth: 320 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({formatDateShort(w.startDate)} → {formatDateShort(w.endDate)})
            </MenuItem>
          ))}
        </TextField>

        {/* Load chỉ hiển thị khi tuần chưa có dữ liệu */}
        {!hasData && (
          <Button variant="contained" onClick={handleLoadData} disabled={!selectedWeek}>
            Load dữ liệu
          </Button>
        )}

        <Button variant="contained" color="secondary" onClick={handleCalculate} disabled={!scores.length}>
          Tính xếp hạng
        </Button>

        {/* Nút lưu/cập nhật: label dựa vào hasData */}
        <Button
          variant="contained"
          color="success"
          onClick={handleSaveOrUpdate}
          disabled={!selectedWeek || !scores.length}
        >
          {hasData ? "Cập nhật dữ liệu" : "Lưu dữ liệu"}
        </Button>
      </Box>

      {gradeKeys.length === 0 && <Typography>Chưa có dữ liệu (nhấn "Load dữ liệu" để lấy nguồn hoặc chọn tuần có dữ liệu đã lưu).</Typography>}

      {gradeKeys.map((grade) => {
        const rows = (groupedByGrade[grade] || []).slice().sort((a, b) => {
          const aRank = a.rank || 9999;
          const bRank = b.rank || 9999;
          if (aRank !== bRank) return aRank - bRank;
          if ((b.totalScore || 0) !== (a.totalScore || 0)) return (b.totalScore || 0) - (a.totalScore || 0);
          return a.className.localeCompare(b.className);
        });

        const topClassName = rows.length ? rows[0].className : null;

        return (
          <Box key={grade} mb={4}>
            <Typography variant="h6" gutterBottom>
              {grade === "undefined" ? `Khối chưa xác định (${rows.length} lớp)` : `Khối ${grade} (${rows.length} lớp)`}
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
