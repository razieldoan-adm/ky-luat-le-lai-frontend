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

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
    fetchSettings();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data);
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

  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn tuần",
        severity: "error",
      });
      return;
    }

    try {
      const [violations, hygiene, attendance, lineup] = await Promise.all([
        api.get(
          `/api/class-violation-scores?weekNumber=${selectedWeek.weekNumber}`
        ),
        api.get(
          `/api/class-hygiene-scores?weekNumber=${selectedWeek.weekNumber}`
        ),
        api.get(
          `/api/class-attendance-summaries?weekNumber=${selectedWeek.weekNumber}`
        ),
        api.get(
          `/api/class-lineup-summaries?weekNumber=${selectedWeek.weekNumber}`
        ),
      ]);

      const data: ScoreRow[] = classes.map((cls) => {
        const v =
          violations.data.find((x: any) => x.className === cls.className)
            ?.totalScore || 0;
        const h =
          hygiene.data.find((x: any) => x.className === cls.className)
            ?.totalScore || 0;
        const a =
          attendance.data.find((x: any) => x.className === cls.className)
            ?.totalScore || 0;
        const l =
          lineup.data.find((x: any) => x.className === cls.className)
            ?.totalScore || 0;

        return {
          className: cls.className,
          grade: cls.grade,
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
      setSnackbar({
        open: true,
        message: "Lỗi khi load dữ liệu",
        severity: "error",
      });
    }
  };

    const handleCalculate = () => {
    if (!scores.length) return;

    const updated = scores.map((s) => {
      const totalViolation =
        disciplineMax -
        (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // Nhóm theo khối và xếp hạng trong từng khối
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    // Gán rank vào từng phần tử
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore - a.totalScore);
      arr.forEach((s, idx) => {
        const target = updated.find(
          (x) => x.className === s.className && x.grade === s.grade
        );
        if (target) target.rank = idx + 1;
      });
    });

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng", severity: "success" });
  };


  const handleSave = async () => {
    if (!selectedWeek) return;

    try {
      await api.post("/api/class-weekly-scores", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setSnackbar({ open: true, message: "Đã lưu dữ liệu", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({ open: true, message: "Lỗi khi lưu dữ liệu", severity: "error" });
    }
  };

  const handleChange = (index: number, field: keyof ScoreRow, value: number) => {
    const updated = [...scores];
    (updated[index] as any)[field] = value;
    setScores(updated);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  };

  // Gom điểm theo khối để render từng bảng
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Box display="flex" gap={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({formatDate(w.startDate)} →{" "}
              {formatDate(w.endDate)})
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

      {Object.keys(groupedByGrade).map((grade) => (
        <Box key={grade} mb={4}>
          <Typography variant="h6" gutterBottom>
            Khối {grade}
          </Typography>
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lớp</TableCell>
                  <TableCell>Học tập</TableCell>
                  <TableCell>Thưởng</TableCell>
                  <TableCell>Vi phạm</TableCell>
                  <TableCell>Vệ sinh</TableCell>
                  <TableCell>Chuyên cần</TableCell>
                  <TableCell>Xếp hàng</TableCell>
                  <TableCell>Tổng nề nếp</TableCell>
                  <TableCell>Tổng</TableCell>
                  <TableCell>Xếp hạng</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedByGrade[grade].map((s, idx) => (
                  <TableRow
                    key={s.className}
                    sx={s.rank === 1 ? { backgroundColor: "#e0f7fa" } : {}}
                  >
                    <TableCell>{s.className}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        sx={{ width: 70 }}
                        value={s.academicScore}
                        onChange={(e) =>
                          handleChange(idx, "academicScore", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        sx={{ width: 70 }}
                        value={s.bonusScore}
                        onChange={(e) =>
                          handleChange(idx, "bonusScore", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>{s.violationScore}</TableCell>
                    <TableCell>{s.hygieneScore}</TableCell>
                    <TableCell>{s.attendanceScore}</TableCell>
                    <TableCell>{s.lineUpScore}</TableCell>
                    <TableCell>{s.totalViolation}</TableCell>
                    <TableCell>{s.totalScore}</TableCell>
                    <TableCell>{s.rank || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      ))}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
