import React, { useEffect, useState } from "react";
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
grade: string | number;
}

interface ClassType {
className: string;
grade: string | number;
scores: number[];
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
      await initializeData(current.weekNumber, normalized);
    } else {
      await initializeData(undefined, normalized);
    }
  } catch (err) {
    console.error("Init error:", err);
  }
};
init();


}, []);

const initializeData = async (
weekNumber?: number,
classListParam?: ClassInfo[]
) => {
try {
const classList = classListParam ?? classes;
const initial: Record<string, ClassType[]> = {};


  GRADES.forEach((grade) => {
    const gradeClasses = classList.filter(
      (c) => String(c.grade) === String(grade)
    );
    initial[grade] = gradeClasses.map((c) => ({
      className: c.className,
      grade: c.grade,
      scores: Array(TOTAL_SLOTS).fill(0),
    }));
  });

  if (typeof weekNumber === "number") {
    const res = await api.get("/api/class-hygiene-scores/by-week", {
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
  console.error("initializeData error:", err);
}


};

const handleWeekChange = async (weekId: string) => {
const w = weekList.find((x) => x._id === weekId) || null;
setSelectedWeek(w);
if (w) await initializeData(w.weekNumber, classes);
};

const handleToggle = (grade: string, classIdx: number, index: number) => {
setData((prev) => {
const copy = { ...prev };
const arr = [...(copy[grade] || [])];
const cls = { ...arr[classIdx] };
const newScores = [...cls.scores];
newScores[index] = newScores[index] === 1 ? 0 : 1;
cls.scores = newScores;
arr[classIdx] = cls;
copy[grade] = arr;
return copy;
});
};

const calculateTotal = (scores: number[]) =>
scores.filter((s) => s === 1).length * hygienePoint;

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
setSnackbar({
open: true,
msg: "Đã lưu điểm vệ sinh thành công!",
sev: "success",
});
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
: Array.from({ length: DAYS_COUNT }).map((_, i) => `Ngày ${i + 2}`);

return (
<Box sx={{ p: 3 }}> <Typography variant="h5" gutterBottom>
🧹 Quản lý điểm vệ sinh lớp học theo tuần </Typography>


  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
    <TextField
      select
      label="Chọn tuần"
      value={selectedWeek?._id || ""}
      onChange={(e) => handleWeekChange(e.target.value)}
      sx={{ width: 320 }}
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

    <Button
      variant="contained"
      color="success"
      onClick={handleSave}
      disabled={saving}
    >
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
                <TableCell rowSpan={3}>Lớp</TableCell>
                {daysLabels.map((label, i) => (
                  <TableCell key={i} align="center" colSpan={2}>
                    {label}
                    <Box sx={{ fontSize: 11, color: "text.secondary" }}>
                      (Sáng / Chiều)
                    </Box>
                  </TableCell>
                ))}
                <TableCell rowSpan={3} align="center">
                  Tổng
                </TableCell>
              </TableRow>
              <TableRow>
                {daysLabels.map((_, i) => (
                  <>
                    <TableCell align="center">Sáng</TableCell>
                    <TableCell align="center">Chiều</TableCell>
                  </>
                ))}
              </TableRow>
              <TableRow>
                {daysLabels.map((_, i) => (
                  <>
                    <TableCell align="center">1 2 3</TableCell>
                    <TableCell align="center">1 2 3</TableCell>
                  </>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {(data[grade] || []).map((cls, classIdx) => (
                <TableRow key={cls.className}>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    {cls.className}
                  </TableCell>
                  {Array.from({ length: DAYS_COUNT }).map((_, dIdx) => (
                    <>
                      {SESSION_LABELS.map((session, sIdx) => (
                        <TableCell align="center" key={session}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "4px",
                            }}
                          >
                            {Array.from({ length: TYPES_PER_SESSION }).map(
                              (_, tIdx) => {
                                const idx =
                                  dIdx * SLOT_PER_DAY +
                                  sIdx * TYPES_PER_SESSION +
                                  tIdx;
                                const checked = cls.scores[idx] === 1;
                                return (
                                  <Checkbox
                                    key={tIdx}
                                    checked={checked}
                                    onChange={() =>
                                      handleToggle(grade, classIdx, idx)
                                    }
                                    size="small"
                                    sx={{
                                      padding: CHECKBOX_PADDING,
                                      "& .MuiSvgIcon-root": { fontSize: 16 },
                                    }}
                                  />
                                );
                              }
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    </>
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
