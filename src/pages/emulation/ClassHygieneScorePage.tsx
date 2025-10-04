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
className: string;
grade: string;
}

interface ClassType {
className: string;
grade: string;
scores: number[];
}

const GRADES = ["6", "7", "8", "9"];
const DAYS_COUNT = 5;
const SESSIONS_PER_DAY = 2;
const TYPES_PER_SESSION = 3;
const SLOT_PER_DAY = SESSIONS_PER_DAY * TYPES_PER_SESSION;
const TOTAL_SLOTS = DAYS_COUNT * SLOT_PER_DAY;

const SESSIONS_LABEL = ["Sáng", "Chiều"];
const VIOLATION_LABELS = ["Không dọn vệ sinh", "Không tắt đèn/quạt", "Không đóng cửa"];

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

const getWeekDays = (startDate: string) => {
const start = new Date(startDate);
const labels: string[] = [];
for (let i = 0; i < DAYS_COUNT; i++) {
const d = new Date(start);
d.setDate(start.getDate() + i);
labels.push(
d.toLocaleDateString("vi-VN", {
weekday: "short",
day: "2-digit",
month: "2-digit",
})
);
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
      className: c.className || c.name,
      grade: String(c.grade || (c.className ? c.className.charAt(0) : "")),
    }));
    setClasses(normalized);

    const wk = weeksRes?.data || [];
    setWeekList(wk);

    if (wk.length > 0) {
      const today = new Date();
      const current =
        wk.find(
          (w: AcademicWeek) =>
            new Date(w.startDate) <= today && today <= new Date(w.endDate)
        ) || wk[0];
      setSelectedWeek(current);
      initializeData(current.weekNumber, normalized);
    } else {
      initializeData(undefined, normalized);
    }
  } catch (err) {
    console.error("Init error:", err);
  }
};
init();
// eslint-disable-next-line react-hooks/exhaustive-deps


}, []);

const initializeData = async (
weekNumber: number | undefined,
classListParam?: ClassInfo[]
) => {
try {
const classList = classListParam ?? classes;
const initial: Record<string, ClassType[]> = {};
GRADES.forEach((grade) => {
const gradeClasses = classList.filter(
(c) => String(c.grade) === String(grade)
);
if (gradeClasses.length > 0) {
initial[grade] = gradeClasses.map((c) => ({
className: c.className,
grade,
scores: Array(TOTAL_SLOTS).fill(0),
}));
} else {
initial[grade] = Array.from({ length: 10 }).map((_, i) => ({
className: `${grade}A${i + 1}`,
grade,
scores: Array(TOTAL_SLOTS).fill(0),
}));
}
});

  if (typeof weekNumber === "number") {
    const res = await api.get("/api/class-hygiene-scores", {
      params: { weekNumber },
    });
    const db: any[] = res.data || [];
    db.forEach((rec) => {
      const target = initial[rec.grade]?.find(
        (c) => c.className === rec.className
      );
      if (target) {
        target.scores =
          Array.isArray(rec.scores) && rec.scores.length === TOTAL_SLOTS
            ? rec.scores
            : Array(TOTAL_SLOTS).fill(0);
      }
    });
  }

  setData(initial);
} catch (err) {
  console.error("Lỗi initializeData:", err);
}

};

const handleWeekChange = (weekId: string) => {
const w = weekList.find((x) => x._id === weekId) || null;
setSelectedWeek(w);
if (w) initializeData(w.weekNumber);
};

const handleToggle = (grade: string, classIdx: number, index: number) => {
setData((prev) => {
const copy = { ...prev };
const classesArr = [...(copy[grade] || [])];
const cls = { ...classesArr[classIdx] };
const newScores = cls.scores.slice();
newScores[index] = newScores[index] === 1 ? 0 : 1;
cls.scores = newScores;
classesArr[classIdx] = cls;
copy[grade] = classesArr;
return copy;
});
};

const calculateTotal = (scores: number[]) =>
scores.filter((s) => s === 1).length * hygienePoint;

const handleSave = async () => {
if (!selectedWeek) {
setSnackbar({
open: true,
msg: "Vui lòng chọn tuần trước khi lưu.",
sev: "error",
});
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
setSnackbar({
open: true,
msg: "Đã lưu điểm vệ sinh thành công!",
sev: "success",
});
} catch (err) {
console.error("Lỗi save:", err);
setSnackbar({ open: true, msg: "Lỗi khi lưu điểm.", sev: "error" });
} finally {
setSaving(false);
}
};

const daysLabels = selectedWeek?.startDate
? getWeekDays(selectedWeek.startDate)
: Array.from({ length: DAYS_COUNT }).map((_, i) => `Ngày ${i + 2}`);

return (
<Box sx={{ p: 3 }}> <Typography variant="h5" gutterBottom>
🧹 Nhập điểm vệ sinh lớp theo tuần (2 buổi × 3 loại lỗi) </Typography>

  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
    <TextField
      select
      label="Chọn tuần"
      value={selectedWeek?._id || ""}
      onChange={(e) => handleWeekChange(e.target.value)}
      sx={{ width: 300 }}
        fetchData(value) 
    >
      <MenuItem value="">-- Chọn tuần --</MenuItem>
      {weekList.map((w) => (
        <MenuItem key={w._id} value={w._id}>
          Tuần {w.weekNumber} (
          {new Date(w.startDate).toLocaleDateString()} -{" "}
          {new Date(w.endDate).toLocaleDateString()})
        </MenuItem>
      ))}
    </TextField>

    <Button
      variant="contained"
      color="success"
      onClick={handleSave}
      disabled={saving}
    >
      {saving ? "Đang lưu..." : "💾 Lưu điểm vệ sinh"}
    </Button>
  </Stack>

  <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
    {GRADES.map((grade) => (
      <Box key={grade} sx={{ flex: "1 1 420px" }}>
        <Paper sx={{ p: 2, minWidth: 420 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Khối {grade}
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                {daysLabels.map((label, dIdx) => (
                  <TableCell key={dIdx} align="center">
                    {label}
                    <Box
                      component="div"
                      sx={{ fontSize: 11, color: "text.secondary" }}
                    >
                      (Sáng / Chiều) — 3 lỗi mỗi buổi
                    </Box>
                  </TableCell>
                ))}
                <TableCell align="center">Tổng</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {(data[grade] || []).map((cls, classIdx) => (
                <TableRow key={cls.className}>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    {cls.className}
                  </TableCell>

                  {Array.from({ length: DAYS_COUNT }).map((_, dIdx) => (
                    <TableCell key={dIdx} align="center">
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {Array.from({ length: SESSIONS_PER_DAY }).map(
                          (_, sIdx) => (
                            <Box
                              key={sIdx}
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                alignItems: "center",
                              }}
                            >
                              {Array.from({
                                length: TYPES_PER_SESSION,
                              }).map((_, tIdx) => {
                                const idx =
                                  dIdx * SLOT_PER_DAY +
                                  sIdx * TYPES_PER_SESSION +
                                  tIdx;
                                const checked = cls.scores?.[idx] === 1;
                                return (
                                  <Checkbox
                                    key={tIdx}
                                    checked={checked}
                                    onChange={() =>
                                      handleToggle(grade, classIdx, idx)
                                    }
                                    title={`${SESSIONS_LABEL[sIdx]} - ${
                                      VIOLATION_LABELS[tIdx]
                                    }`}
                                    size="small"
                                  />
                                );
                              })}
                            </Box>
                          )
                        )}
                      </Box>
                    </TableCell>
                  ))}

                  <TableCell align="center">
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
