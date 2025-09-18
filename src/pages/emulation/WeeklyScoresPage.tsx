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
import dayjs from "dayjs";

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
  homeroomTeacher: string;
}

interface ScoreRow {
  className: string;
  grade: string;
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
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "info" });

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
      setDisciplineMax(res.data?.disciplineMax || 100);
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const handleLoad = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần.", severity: "error" });
      return;
    }

    try {
      const [violationRes, hygieneRes, attendanceRes, lineupRes] = await Promise.all([
        api.get(`/api/class-violation-scores/week/${selectedWeek.weekNumber}`),
        api.get(`/api/class-hygiene-scores/week/${selectedWeek.weekNumber}`),
        api.get(`/api/class-attendance-summaries/week/${selectedWeek.weekNumber}`),
        api.get(`/api/class-lineup-summaries/week/${selectedWeek.weekNumber}`),
      ]);

      const violations = violationRes.data;
      const hygiene = hygieneRes.data;
      const attendance = attendanceRes.data;
      const lineup = lineupRes.data;

      const newRows: ScoreRow[] = classes.map((cls) => {
        const v = violations.find((x: any) => x.className === cls.className)?.score || 0;
        const h = hygiene.find((x: any) => x.className === cls.className)?.score || 0;
        const a = attendance.find((x: any) => x.className === cls.className)?.score || 0;
        const l = lineup.find((x: any) => x.className === cls.className)?.score || 0;

        const totalViolation = disciplineMax - (v + h + a + l);
        const totalScore = totalViolation; // tạm, sẽ cộng academic + bonus sau

        return {
          className: cls.className,
          grade: cls.grade,
          academicScore: 0,
          bonusScore: 0,
          violationScore: v,
          hygieneScore: h,
          attendanceScore: a,
          lineUpScore: l,
          totalViolation,
          totalScore,
          rank: 0,
        };
      });

      setRows(newRows);
      setSnackbar({ open: true, message: "Đã tải dữ liệu.", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
      setSnackbar({ open: true, message: "Không thể tải dữ liệu.", severity: "error" });
    }
  };

  const handleCalculate = () => {
    const updated = [...rows];

    // Nhóm theo grade
    const grouped = updated.reduce((acc: any, r) => {
      if (!acc[r.grade]) acc[r.grade] = [];
      acc[r.grade].push(r);
      return acc;
    }, {});

    Object.keys(grouped).forEach((grade) => {
      grouped[grade].forEach((r: ScoreRow) => {
        r.totalViolation = disciplineMax - (r.violationScore + r.hygieneScore + r.attendanceScore + r.lineUpScore);
        r.totalScore = r.academicScore + r.bonusScore + r.totalViolation;
      });

      grouped[grade].sort((a: ScoreRow, b: ScoreRow) => b.totalScore - a.totalScore);
      grouped[grade].forEach((r: ScoreRow, idx: number) => (r.rank = idx + 1));
    });

    setRows(updated);
    setSnackbar({ open: true, message: "Đã tính toán xếp hạng.", severity: "success" });
  };

  const handleSave = async () => {
    if (!selectedWeek) return;

    try {
      await Promise.all(
        rows.map((r) =>
          api.post("/api/class-weekly-scores", {
            className: r.className,
            grade: r.grade,
            weekNumber: selectedWeek.weekNumber,
            academicScore: r.academicScore,
            bonusScore: r.bonusScore,
            violationScore: r.violationScore,
            hygieneScore: r.hygieneScore,
            attendanceScore: r.attendanceScore,
            lineUpScore: r.lineUpScore,
            totalViolation: r.totalViolation,
            totalScore: r.totalScore,
            rank: r.rank,
          })
        )
      );
      setSnackbar({ open: true, message: "Đã lưu dữ liệu.", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({ open: true, message: "Lưu thất bại.", severity: "error" });
    }
  };

  const handleChangeCell = (index: number, field: keyof ScoreRow, value: number) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm tuần
      </Typography>

      {/* Chọn tuần */}
      <TextField
        select
        label="Chọn tuần"
        value={selectedWeek?._id || ""}
        onChange={(e) => setSelectedWeek(weeks.find((w) => w._id === e.target.value) || null)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        {weeks.map((w) => (
          <MenuItem key={w._id} value={w._id}>
            Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} - {dayjs(w.endDate).format("DD/MM")})
          </MenuItem>
        ))}
      </TextField>

      <Box mb={2}>
        <Button variant="contained" onClick={handleLoad} sx={{ mr: 1 }}>
          Load dữ liệu
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCalculate} sx={{ mr: 1 }}>
          Tính toán xếp hạng
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          Lưu
        </Button>
      </Box>

      {/* Bảng chia theo khối */}
      {["10", "11", "12"].map((grade) => {
        const filtered = rows.filter((r) => r.grade === grade);
        if (filtered.length === 0) return null;

        return (
          <Box key={grade} mb={4}>
            <Typography variant="h6">Khối {grade}</Typography>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell>Điểm học tập</TableCell>
                    <TableCell>Điểm thưởng</TableCell>
                    <TableCell>Kỷ luật</TableCell>
                    <TableCell>Vệ sinh</TableCell>
                    <TableCell>Chuyên cần</TableCell>
                    <TableCell>Xếp hàng</TableCell>
                    <TableCell>Tổng nề nếp</TableCell>
                    <TableCell>Tổng điểm</TableCell>
                    <TableCell>Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row, idx) => (
                    <TableRow
                      key={idx}
                      sx={row.rank === 1 ? { backgroundColor: "rgba(255,215,0,0.3)" } : {}}
                    >
                      <TableCell>{row.className}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.academicScore}
                          onChange={(e) => handleChangeCell(rows.indexOf(row), "academicScore", Number(e.target.value))}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.bonusScore}
                          onChange={(e) => handleChangeCell(rows.indexOf(row), "bonusScore", Number(e.target.value))}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{row.violationScore}</TableCell>
                      <TableCell>{row.hygieneScore}</TableCell>
                      <TableCell>{row.attendanceScore}</TableCell>
                      <TableCell>{row.lineUpScore}</TableCell>
                      <TableCell>{row.totalViolation}</TableCell>
                      <TableCell>{row.totalScore}</TableCell>
                      <TableCell>{row.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        );
      })}

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
