
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
  _id: string;
  className: string;
  grade: string | number;
}

interface HygieneRecord {
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

const GRADES = ["6", "7", "8", "9"];
const DAYS_COUNT = 5;
const SESSIONS_PER_DAY = 2;
const TYPES_PER_SESSION = 3;

const SESSIONS_LABEL = ["Sáng", "Chiều"];
const VIOLATION_LABELS = [
  "Không trực vệ sinh lớp",
  "Không tắt đèn/quạt đầu giờ hoặc giờ chơi",
  "Không đóng cửa lớp",
];

export default function ClassHygieneScorePage() {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [data, setData] = useState<Record<string, Record<string, HygieneRecord[]>>>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    msg: "",
    sev: "success" as "success" | "error",
  });
  const [saving, setSaving] = useState(false);

  const CHECKBOX_PADDING = "2px";

  const getWeekDays = (startDate: string) => {
    const start = new Date(startDate);
    const labels: { label: string; date: Date }[] = [];
    let d = new Date(start);
    while (labels.length < DAYS_COUNT) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        labels.push({
          label: d.toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          }),
          date: new Date(d),
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return labels;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [classesRes, weeksRes] = await Promise.all([
          api.get("/api/classes").catch(() => ({ data: [] })),
          api.get("/api/academic-weeks/study-weeks").catch(() => ({ data: [] })),
        ]);

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
            wk.find(
              (w: AcademicWeek) =>
                new Date(w.startDate) <= today && today <= new Date(w.endDate)
            ) || wk[0];
          setSelectedWeek(current);
          await initializeData(current.weekNumber, normalized);
        }
      } catch (err) {
        console.error("Init error:", err);
      }
    };
    init();
  }, []);

  const initializeData = async (weekNumber: number, classList: ClassInfo[]) => {
    try {
      const initial: Record<string, Record<string, HygieneRecord[]>> = {};
      GRADES.forEach((grade) => {
        initial[grade] = {};
        classList
          .filter((c) => String(c.grade) === String(grade))
          .forEach((c) => {
            initial[grade][c._id] = Array(DAYS_COUNT).fill(null).map(() => ({
              absentDuty: 0,
              noLightFan: 0,
              notClosedDoor: 0,
            }));
          });
      });

      const res = await api.get("/api/class-hygiene-scores/by-week", {
        params: { weekNumber },
      });
      const db: any[] = res.data || [];

      db.forEach((rec) => {
        const cls = classList.find((c) => c._id === rec.classId?._id);
        if (!cls) return;
        const grade = String(cls.grade);
        const idx = getDayIndex(rec.date, selectedWeek?.startDate || "");
        if (idx !== -1 && initial[grade]?.[cls._id]) {
          initial[grade][cls._id][idx] = {
            absentDuty: rec.absentDuty,
            noLightFan: rec.noLightFan,
            notClosedDoor: rec.notClosedDoor,
          };
        }
      });

      setData(initial);
    } catch (err) {
      console.error("Lỗi initializeData:", err);
    }
  };

  const getDayIndex = (dateStr: string, startDate: string) => {
    const base = new Date(startDate);
    const target = new Date(dateStr);
    let idx = 0;
    let d = new Date(base);
    while (idx < DAYS_COUNT) {
      if (d.getDay() >= 1 && d.getDay() <= 5) {
        if (
          d.getFullYear() === target.getFullYear() &&
          d.getMonth() === target.getMonth() &&
          d.getDate() === target.getDate()
        ) {
          return idx;
        }
        idx++;
      }
      d.setDate(d.getDate() + 1);
    }
    return -1;
  };

  const handleWeekChange = async (weekId: string) => {
    const w = weekList.find((x) => x._id === weekId) || null;
    setSelectedWeek(w);
    if (w) {
      await initializeData(w.weekNumber, classes);
    }
  };

  const handleToggle = (
    grade: string,
    classId: string,
    dayIdx: number,
    session: number,
    type: number
  ) => {
    setData((prev) => {
      const copy = { ...prev };
      const clsDays = [...copy[grade][classId]];
      const rec = { ...clsDays[dayIdx] };

      if (type === 0) rec.absentDuty = rec.absentDuty ^ (1 << session);
      if (type === 1) rec.noLightFan = rec.noLightFan ^ (1 << session);
      if (type === 2) rec.notClosedDoor = rec.notClosedDoor ^ (1 << session);

      clsDays[dayIdx] = rec;
      copy[grade][classId] = clsDays;
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, msg: "Vui lòng chọn tuần.", sev: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload: any[] = [];
      const daysLabels = getWeekDays(selectedWeek.startDate);

      GRADES.forEach((g) => {
        Object.entries(data[g] || {}).forEach(([classId, records]) => {
          records.forEach((r, idx) => {
            const date = daysLabels[idx]?.date;
            if (!date) return;
            payload.push({
              classId,
              weekNumber: selectedWeek.weekNumber,
              date,
              absentDuty: r.absentDuty,
              noLightFan: r.noLightFan,
              notClosedDoor: r.notClosedDoor,
            });
          });
        });
      });

      await api.post("/api/class-hygiene-scores", {
        weekNumber: selectedWeek.weekNumber,
        scores: payload,
      });

      setSnackbar({
        open: true,
        msg: "Đã lưu điểm vệ sinh thành công!",
        sev: "success",
      });
      await initializeData(selectedWeek.weekNumber, classes);
    } catch (err) {
      console.error("Lỗi save:", err);
      setSnackbar({ open: true, msg: "Lỗi khi lưu điểm.", sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  const daysLabels = selectedWeek?.startDate
    ? getWeekDays(selectedWeek.startDate)
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần
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
            let status = "";
            if (new Date(w.endDate) < today) status = " (đã qua)";
            else if (new Date(w.startDate) > today) status = " (chưa diễn ra)";
            else status = " (hiện tại)";

            return (
              <MenuItem
                key={w._id}
                value={w._id}
                disabled={new Date(w.startDate) > today}
              >
                Tuần {w.weekNumber}
                {status}
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
                    {daysLabels.map((label, idx) => (
                      <TableCell key={idx} align="center">
                        {label.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(data[grade] || {}).map(([classId, records]) => {
                    const cls = classes.find((c) => c._id === classId);
                    if (!cls) return null;
                    return (
                      <TableRow key={classId}>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          {cls.className}
                        </TableCell>
                        {records.map((r, dIdx) => (
                          <TableCell key={dIdx} align="center">
                            {Array.from({ length: SESSIONS_PER_DAY }).map((_, sIdx) => (
                              <Box
                                key={sIdx}
                                sx={{
                                  display: "flex",
                                  gap: "4px",
                                  justifyContent: "center",
                                }}
                              >
                                {Array.from({ length: TYPES_PER_SESSION }).map((__, tIdx) => {
                                  const checked =
                                    (tIdx === 0 && (r.absentDuty >> sIdx) & 1) ||
                                    (tIdx === 1 && (r.noLightFan >> sIdx) & 1) ||
                                    (tIdx === 2 && (r.notClosedDoor >> sIdx) & 1);
                                  return (
                                    <Checkbox
                                      key={tIdx}
                                      checked={!!checked}
                                      onChange={() =>
                                        handleToggle(grade, classId, dIdx, sIdx, tIdx)
                                      }
                                      size="small"
                                      sx={{
                                        padding: CHECKBOX_PADDING,
                                        "& .MuiSvgIcon-root": { fontSize: 16 },
                                      }}
                                    />
                                  );
                                })}
                              </Box>
                            ))}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
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
