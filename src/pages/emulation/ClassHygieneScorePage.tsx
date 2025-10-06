
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
  CircularProgress,
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
  absentDutyMorning: number;
  absentDutyAfternoon: number;
  noLightFanMorning: number;
  noLightFanAfternoon: number;
  notClosedDoorMorning: number;
  notClosedDoorAfternoon: number;
}

const GRADES = ["6", "7", "8", "9"];
const DAYS_COUNT = 5;
const VIOLATION_LABELS = [
  "Không trực vệ sinh lớp",
  "Không tắt đèn/quạt đầu giờ hoặc giờ chơi",
  "Không đóng cửa lớp",
];
const SESSIONS_LABEL = ["Sáng", "Chiều"];

export default function ClassHygieneScorePage() {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [data, setData] = useState<Record<string, Record<string, HygieneRecord[]>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    msg: "",
    sev: "success" as "success" | "error",
  });

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [classesRes, weeksRes] = await Promise.all([
          api.get("/api/classes"),
          api.get("/api/academic-weeks/study-weeks"),
        ]);

        const cls = (classesRes.data || []).map((c: any) => ({
          _id: c._id,
          className: c.className || c.name,
          grade: String(c.grade || (c.className ? c.className.charAt(0) : "")),
        }));
        setClasses(cls);

        const wk = weeksRes.data || [];
        setWeekList(wk);

        if (wk.length > 0) {
          const today = new Date();
          const current =
            wk.find(
              (w: AcademicWeek) =>
                new Date(w.startDate) <= today && today <= new Date(w.endDate)
            ) || wk[0];
          setSelectedWeek(current);
          await initializeData(current.weekNumber, cls);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const initializeData = async (weekNumber: number, classList: ClassInfo[]) => {
    const initial: Record<string, Record<string, HygieneRecord[]>> = {};
    GRADES.forEach((g) => {
      initial[g] = {};
      classList
        .filter((c) => String(c.grade) === String(g))
        .forEach((c) => {
          initial[g][c._id] = Array(DAYS_COUNT).fill(null).map(() => ({
            absentDutyMorning: 0,
            absentDutyAfternoon: 0,
            noLightFanMorning: 0,
            noLightFanAfternoon: 0,
            notClosedDoorMorning: 0,
            notClosedDoorAfternoon: 0,
          }));
        });
    });

    try {
      const res = await api.get("/api/class-hygiene/by-week", {
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
            absentDutyMorning: rec.absentDutyMorning,
            absentDutyAfternoon: rec.absentDutyAfternoon,
            noLightFanMorning: rec.noLightFanMorning,
            noLightFanAfternoon: rec.noLightFanAfternoon,
            notClosedDoorMorning: rec.notClosedDoorMorning,
            notClosedDoorAfternoon: rec.notClosedDoorAfternoon,
          };
        }
      });
      setData(initial);
    } catch (err) {
      console.error("Lỗi khi load hygiene:", err);
    }
  };

  const handleToggle = (
    grade: string,
    classId: string,
    dayIdx: number,
    session: "Morning" | "Afternoon",
    type: number
  ) => {
    setData((prev) => {
      const copy = structuredClone(prev);
      const rec = copy[grade][classId][dayIdx];
      if (type === 0) rec[`absentDuty${session}`] ^= 1;
      if (type === 1) rec[`noLightFan${session}`] ^= 1;
      if (type === 2) rec[`notClosedDoor${session}`] ^= 1;
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    setSaving(true);
    try {
      const payload: any[] = [];
      const days = getWeekDays(selectedWeek.startDate);
      GRADES.forEach((g) => {
        Object.entries(data[g] || {}).forEach(([classId, recs]) => {
          recs.forEach((r, idx) => {
            const date = days[idx]?.date;
            if (!date) return;
            payload.push({
              classId,
              weekNumber: selectedWeek.weekNumber,
              date,
              ...r,
            });
          });
        });
      });
      await api.post("/api/class-hygiene/save", {
        weekNumber: selectedWeek.weekNumber,
        scores: payload,
      });
      setSnackbar({
        open: true,
        msg: "Đã lưu điểm vệ sinh thành công!",
        sev: "success",
      });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, msg: "Lỗi khi lưu điểm!", sev: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  const daysLabels = selectedWeek?.startDate ? getWeekDays(selectedWeek.startDate) : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp (2 buổi / ngày)
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const w = weekList.find((wk) => wk._id === e.target.value) || null;
            setSelectedWeek(w);
            if (w) initializeData(w.weekNumber, classes);
          }}
          sx={{ width: 300 }}
        >
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "💾 Lưu"}
        </Button>
      </Stack>

      <Stack direction="row" flexWrap="wrap" spacing={2}>
        {GRADES.map((g) => (
          <Box key={g} sx={{ flex: "1 1 400px" }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Khối {g}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    {daysLabels.map((d, idx) => (
                      <TableCell key={idx} align="center">
                        {d.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(data[g] || {}).map(([classId, recs]) => {
                    const cls = classes.find((c) => c._id === classId);
                    if (!cls) return null;
                    return (
                      <TableRow key={classId}>
                        <TableCell>{cls.className}</TableCell>
                        {recs.map((r, dIdx) => (
                          <TableCell key={dIdx} align="center">
                            {["Morning", "Afternoon"].map((sess) => (
                              <Box
                                key={sess}
                                sx={{
                                  display: "flex",
                                  gap: "3px",
                                  justifyContent: "center",
                                  mb: 0.5,
                                }}
                              >
                                {VIOLATION_LABELS.map((_, tIdx) => {
                                  const checked =
                                    tIdx === 0
                                      ? r[`absentDuty${sess}`]
                                      : tIdx === 1
                                      ? r[`noLightFan${sess}`]
                                      : r[`notClosedDoor${sess}`];
                                  return (
                                    <Checkbox
                                      key={tIdx}
                                      checked={!!checked}
                                      onChange={() =>
                                        handleToggle(g, classId, dIdx, sess as "Morning" | "Afternoon", tIdx)
                                      }
                                      size="small"
                                      sx={{
                                        padding: CHECKBOX_PADDING,
                                        "& .MuiSvgIcon-root": { fontSize: 16 },
                                      }}
                                      title={`${sess} - ${VIOLATION_LABELS[tIdx]}`}
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

