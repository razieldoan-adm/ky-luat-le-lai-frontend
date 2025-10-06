
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
  Checkbox,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassInfo {
  _id?: string;
  className: string;
  grade: string | number;
}

interface ClassType {
  className: string;
  grade: string | number;
  scores: number[]; // flattened scores: DAYS_COUNT * (2 sessions * 3 types) = TOTAL_SLOTS
}

const GRADES = ["6", "7", "8", "9"];
const DAYS_COUNT = 5;
const SESSIONS_PER_DAY = 2;
const TYPES_PER_SESSION = 3;
const SLOT_PER_DAY = SESSIONS_PER_DAY * TYPES_PER_SESSION;
const TOTAL_SLOTS = DAYS_COUNT * SLOT_PER_DAY;

const SESSION_LABELS = ["Sáng", "Chiều"];

export default function ClassHygieneScorePage() {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [data, setData] = useState<Record<string, ClassType[]>>({});
  const [hygienePoint, setHygienePoint] = useState<number>(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    msg: "",
    sev: "success" as "success" | "error",
  });
  const [saving, setSaving] = useState(false);

  const CHECKBOX_PADDING = "2px";

  // tạo labels cho 5 ngày làm việc dựa trên startDate
  const getWeekDays = (startDate: string) => {
    const start = new Date(startDate);
    const labels: string[] = [];
    let d = new Date(start);
    while (labels.length < DAYS_COUNT) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        labels.push(
          d.toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          })
        );
      }
      d.setDate(d.getDate() + 1);
    }
    return labels;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [settingsRes, classesRes, weeksRes] = await Promise.all([
          api.get("/api/settings").catch(() => ({ data: null })),
          api.get("/api/classes").catch(() => ({ data: [] })),
          api.get("/api/academic-weeks/study-weeks").catch(() => ({ data: [] })),
        ]);

        const point = settingsRes?.data?.disciplinePointDeduction?.hygiene;
        if (typeof point === "number") setHygienePoint(point);

        const rawClasses = classesRes?.data || [];
        const normalized: ClassInfo[] = rawClasses.map((c: any) => ({
          _id: c._id,
          className: c.className || c.name,
          grade: String(c.grade || (c.className ? c.className.charAt(0) : "")),
        }));
        setClasses(normalized);

        const wk = weeksRes?.data || [];
        setWeekList(wk);

        if (wk.length > 0) {
          const today = new Date();
          const current =
            wk.find((w: AcademicWeek) => new Date(w.startDate) <= today && today <= new Date(w.endDate)) ||
            wk[0];
          setSelectedWeek(current);
          await initializeData(current.weekNumber, normalized);
        } else {
          await initializeData(undefined, normalized);
        }
      } catch (err) {
        console.error("Init error:", err);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * initializeData:
   * - Tạo cấu trúc ban đầu (theo từng khối)
   * - Nếu truyền weekNumber thì lấy dữ liệu từ DB và khớp vào cấu trúc ban đầu
   *
   * Important fixes:
   * - normalize grade key bằng String(...)
   * - cố gắng tìm className trong rec (rec.className || rec.classId?.name)
   */
  const initializeData = async (weekNumber?: number, classListParam?: ClassInfo[]) => {
    try {
      const classList = classListParam ?? classes;
      const initial: Record<string, ClassType[]> = {};

      // build initial per grade using available classes (if none, still create placeholders)
      GRADES.forEach((grade) => {
        const gradeClasses = classList.filter((c) => String(c.grade) === String(grade));
        if (gradeClasses.length > 0) {
          initial[grade] = gradeClasses.map((c) => ({
            className: c.className,
            grade: c.grade,
            scores: Array(TOTAL_SLOTS).fill(0),
          }));
        } else {
          // fallback placeholders (A1..A10)
          initial[grade] = Array.from({ length: 10 }).map((_, i) => ({
            className: `${grade}A${i + 1}`,
            grade,
            scores: Array(TOTAL_SLOTS).fill(0),
          }));
        }
      });

      // if week provided, fetch DB records and merge
      if (typeof weekNumber === "number") {
        const res = await api.get("/api/class-hygiene-scores/by-week", {
          params: { weekNumber },
        });
        const db: any[] = res.data || [];

        db.forEach((rec) => {
          // robustly find className and grade
          const classNameFromRec =
            rec.className ??
            rec.classId?.name ??
            rec.class?.name ??
            (rec.classId && rec.classId.name) ??
            "";

          const gradeKey = String(rec.grade ?? rec.gradeNumber ?? rec.classId?.grade ?? (classNameFromRec ? classNameFromRec.charAt(0) : ""));

          if (!initial[gradeKey]) {
            // if grade not present, try to guess from classList
            const found = classList.find((c) => (rec.classId && c._id === String(rec.classId)) || c.className === classNameFromRec);
            const fallbackGrade = found ? String(found.grade) : null;
            if (fallbackGrade && initial[fallbackGrade]) {
              // try using fallback gradeKey
              const target2 = initial[fallbackGrade].find((c) => c.className === (classNameFromRec || rec.className));
              if (target2) {
                if (Array.isArray(rec.scores) && rec.scores.length === TOTAL_SLOTS) {
                  target2.scores = rec.scores;
                }
                return;
              }
            }
            return;
          }

          // find matching class entry inside initial[gradeKey]
          const target = initial[gradeKey].find((c) => c.className === classNameFromRec || c.className === rec.className);
          if (target) {
            if (Array.isArray(rec.scores) && rec.scores.length === TOTAL_SLOTS) {
              target.scores = rec.scores;
            } else if (rec.scores && Array.isArray(rec.scores) && rec.scores.length > 0) {
              // if length mismatch, try to copy as much as possible
              const copy = Array(TOTAL_SLOTS).fill(0);
              for (let i = 0; i < Math.min(rec.scores.length, TOTAL_SLOTS); i++) copy[i] = rec.scores[i];
              target.scores = copy;
            } else {
              // no array: maybe older schema — ignore (leave zeros)
            }
          }
        });
      }

      setData(initial);
    } catch (err) {
      console.error("Lỗi initializeData:", err);
    }
  };

  // when user changes week from UI
  const handleWeekChange = async (weekId: string) => {
    const w = weekList.find((x) => x._id === weekId) || null;
    setSelectedWeek(w);
    if (w) await initializeData(w.weekNumber, classes);
  };

  // toggle checkbox
  const handleToggle = (grade: string, classIdx: number, index: number) => {
    setData((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[grade] || [])];
      const cls = { ...arr[classIdx] };
      const newScores = cls.scores.slice();
      newScores[index] = newScores[index] === 1 ? 0 : 1;
      cls.scores = newScores;
      arr[classIdx] = cls;
      copy[grade] = arr;
      return copy;
    });
  };

  const calculateTotal = (scores: number[]) =>
    scores.filter((s) => s === 1).length * hygienePoint;

  // save — after save reload from DB to reflect persisted state
  const handleSave = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, msg: "Vui lòng chọn tuần.", sev: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        weekNumber: selectedWeek.weekNumber,
        scores: GRADES.flatMap((g) =>
          (data[g] || []).map((c) => ({
            className: c.className,
            grade: c.grade,
            scores: c.scores,
            total: calculateTotal(c.scores),
          }))
        ),
      };
      await api.post("/api/class-hygiene-scores", payload);

      setSnackbar({ open: true, msg: "Đã lưu điểm vệ sinh thành công!", sev: "success" });

      // reload directly from DB (ensure fresh)
      await initializeData(selectedWeek.weekNumber, classes);
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({ open: true, msg: "Lỗi khi lưu điểm.", sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const daysLabels = selectedWeek?.startDate
    ? getWeekDays(selectedWeek.startDate)
    : Array.from({ length: DAYS_COUNT }).map((_, idx) => `Ngày ${idx + 2}`);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🧹 Quản lý điểm vệ sinh lớp học theo tuần
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => handleWeekChange(e.target.value)}
          sx={{ width: 360 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weekList.map((w) => {
            const today = new Date();
            const notStarted = new Date(w.startDate) > today;
            const ended = new Date(w.endDate) < today;
            return (
              <MenuItem key={w._id} value={w._id} disabled={notStarted}>
                Tuần {w.weekNumber}
                {ended ? " (đã qua)" : notStarted ? " (chưa diễn ra)" : " (hiện tại)"}
              </MenuItem>
            );
          })}
        </TextField>

        <Button variant="contained" color="success" onClick={handleSave} disabled={saving}>
          {saving ? "Đang lưu..." : "💾 Lưu điểm"}
        </Button>
      </Stack>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Mỗi ngày gồm 2 buổi × 3 lỗi (vắng trực, không quạt/đèn, không khóa cửa).
      </Typography>

      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        {GRADES.map((grade) => (
          <Box key={grade} sx={{ flex: "1 1 420px" }}>
            <Paper sx={{ p: 2, minWidth: 420 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Khối {grade}
              </Typography>

              <Table size="small" sx={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={3} sx={{ fontSize: 12, padding: "6px" }}>
                      Lớp
                    </TableCell>

                    {daysLabels.map((label, dIdx) => (
                      <TableCell key={`day-${dIdx}`} align="center" colSpan={2} sx={{ padding: "6px" }}>
                        {label}
                        <Box component="div" sx={{ fontSize: 11, color: "text.secondary" }}>
                          (Sáng / Chiều)
                        </Box>
                      </TableCell>
                    ))}

                    <TableCell rowSpan={3} align="center" sx={{ fontSize: 12, padding: "6px" }}>
                      Tổng
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    {daysLabels.map((_, dIdx) => [
                      <TableCell key={`s-${dIdx}`} align="center" sx={{ fontSize: 11, padding: "4px" }}>
                        Sáng
                      </TableCell>,
                      <TableCell key={`c-${dIdx}`} align="center" sx={{ fontSize: 11, padding: "4px" }}>
                        Chiều
                      </TableCell>,
                    ])}
                  </TableRow>

                  <TableRow>
                    {daysLabels.map((_, dIdx) => [
                      <TableCell key={`s2-${dIdx}`} align="center" sx={{ fontSize: 11, padding: "4px" }}>
                        1&nbsp;2&nbsp;3
                      </TableCell>,
                      <TableCell key={`c2-${dIdx}`} align="center" sx={{ fontSize: 11, padding: "4px" }}>
                        1&nbsp;2&nbsp;3
                      </TableCell>,
                    ])}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {(data[grade] || []).map((cls, classIdx) => (
                    <TableRow key={cls.className}>
                      <TableCell sx={{ fontWeight: "bold", padding: "6px" }}>{cls.className}</TableCell>

                      {Array.from({ length: DAYS_COUNT }).map((_, dIdx) => {
                        // morning cell (3 checkboxes) and afternoon cell (3 checkboxes)
                        const morningCell = (
                          <TableCell key={`m-${dIdx}`} align="center" sx={{ padding: "6px" }}>
                            <Box sx={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                              {Array.from({ length: TYPES_PER_SESSION }).map((__, tIdx) => {
                                const idx = dIdx * SLOT_PER_DAY + 0 * TYPES_PER_SESSION + tIdx;
                                const checked = cls.scores?.[idx] === 1;
                                return (
                                  <Checkbox
                                    key={`m-${dIdx}-t${tIdx}`}
                                    checked={checked}
                                    onChange={() => handleToggle(grade, classIdx, idx)}
                                    size="small"
                                    sx={{ padding: CHECKBOX_PADDING, margin: 0, "& .MuiSvgIcon-root": { fontSize: 16 } }}
                                  />
                                );
                              })}
                            </Box>
                          </TableCell>
                        );

                        const afternoonCell = (
                          <TableCell key={`a-${dIdx}`} align="center" sx={{ padding: "6px" }}>
                            <Box sx={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                              {Array.from({ length: TYPES_PER_SESSION }).map((__, tIdx) => {
                                const idx = dIdx * SLOT_PER_DAY + 1 * TYPES_PER_SESSION + tIdx;
                                const checked = cls.scores?.[idx] === 1;
                                return (
                                  <Checkbox
                                    key={`a-${dIdx}-t${tIdx}`}
                                    checked={checked}
                                    onChange={() => handleToggle(grade, classIdx, idx)}
                                    size="small"
                                    sx={{ padding: CHECKBOX_PADDING, margin: 0, "& .MuiSvgIcon-root": { fontSize: 16 } }}
                                  />
                                );
                              })}
                            </Box>
                          </TableCell>
                        );

                        return [morningCell, afternoonCell];
                      })}

                      <TableCell align="center" sx={{ padding: "6px" }}>
                        {calculateTotal(cls.scores)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ))}
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.sev}>{snackbar.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

