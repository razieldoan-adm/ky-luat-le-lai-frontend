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
  Snackbar,
  Alert,
  TableContainer,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Score {
  _id: string;
  className: string;
  grade: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore?: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
}

interface ClassItem {
  _id: string;
  className: string;
  grade: string;
  teacher: string;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
    fetchClasses();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy weeks:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) {
        setDisciplineMax(res.data.disciplineMax);
      }
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes/with-teacher");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  const normalize = (str: string) =>
    str ? str.toString().trim().toUpperCase() : "";

  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      const validClasses = classList
        .filter((c) => c.teacher && c.teacher.trim() !== "")
        .map((c) => normalize(c.className));

      const filtered = res.data.filter((s: Score) =>
        validClasses.includes(normalize(s.className))
      );

      const list: Score[] = filtered.map((s: Score) => ({
        ...s,
        bonusScore: s.bonusScore || 0,
      }));

      const withCalc = calculateTotals(list);
      const withRanks = assignRanksPerGrade(withCalc);
      setScores(withRanks);

      if (filtered.length === 0) {
        setSnackbar({
          open: true,
          message: "Chưa có dữ liệu tuần này. Bấm 'Gom dữ liệu' để tính.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
    }
  };

  const calculateTotals = (list: Score[]) => {
    return list.map((s) => {
      const totalViolation =
        disciplineMax -
        ((s.disciplineScore || 0) +
          (s.hygieneScore || 0) +
          (s.attendanceScore || 0) +
          (s.lineUpScore || 0));

      const totalRankScore =
        (s.academicScore || 0) + totalViolation + (s.bonusScore || 0);

      return {
        ...s,
        totalViolation,
        totalRankScore,
      };
    });
  };

  const assignRanksPerGrade = (list: Score[]) => {
    const byGrade: Record<string, Score[]> = {};
    list.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });

    Object.keys(byGrade).forEach((g) => {
      const sorted = [...byGrade[g]].sort(
        (a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0)
      );
      sorted.forEach((s, idx) => {
        const target = list.find((x) => x._id === s._id);
        if (target) target.rank = idx + 1;
      });
    });

    return [...list];
  };

  const handleBonusChange = (id: string, value: number) => {
    const updated = scores.map((s) =>
      s._id === id ? { ...s, bonusScore: value } : s
    );
    const withCalc = calculateTotals(updated);
    const withRanks = assignRanksPerGrade(withCalc);
    setScores(withRanks);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores/save-bonus", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setSnackbar({
        open: true,
        message: "Đã lưu dữ liệu tuần thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({
        open: true,
        message: "Có lỗi khi lưu dữ liệu!",
        severity: "error",
      });
    }
  };

  const handleAggregate = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores/calculate", {
        weekNumber: selectedWeek.weekNumber,
      });
      fetchScores();
      setSnackbar({
        open: true,
        message: "Đã gom dữ liệu tuần thành công!",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi gom dữ liệu:", err);
      setSnackbar({
        open: true,
        message: "Có lỗi khi gom dữ liệu!",
        severity: "error",
      });
    }
  };

  const getRowStyle = (idx: number, rank?: number) => {
    let style: any = {
      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9",
    };
    if (rank === 1) style.backgroundColor = "#ffe082";
    if (rank === 2) style.backgroundColor = "#b2ebf2";
    if (rank === 3) style.backgroundColor = "#c8e6c9";
    return style;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
            setScores([]);
          }}
          sx={{ width: 200 }}
          size="small"
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="secondary" onClick={handleAggregate}>
            Gom dữ liệu
          </Button>
          <Button variant="outlined" onClick={fetchScores}>
            🔄 Tải dữ liệu
          </Button>
          <Button variant="contained" color="success" onClick={handleSave}>
            💾 Lưu
          </Button>
        </Stack>
      </Box>

      {["6", "7", "8", "9"].map((grade) => {
        const gradeScores = scores.filter((s) => s.grade === grade);
        if (gradeScores.length === 0) return null;

        return (
          <Box key={grade} mb={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Khối {grade}
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      STT
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Lớp
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Điểm thưởng
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Học tập
                    </TableCell>
                    <TableCell align="center" colSpan={4} sx={{ border: "1px solid #000" }}>
                      Nề nếp (điểm trừ)
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Tổng nề nếp
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Tổng
                    </TableCell>
                    <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                      Xếp hạng
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell align="center" sx={{ border: "1px solid #000" }}>
                      Kỷ luật
                    </TableCell>
                    <TableCell align="center" sx={{ border: "1px solid #000" }}>
                      Vệ sinh
                    </TableCell>
                    <TableCell align="center" sx={{ border: "1px solid #000" }}>
                      Chuyên cần
                    </TableCell>
                    <TableCell align="center" sx={{ border: "1px solid #000" }}>
                      Xếp hàng
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {gradeScores.map((s, idx) => (
                    <TableRow key={s._id} sx={getRowStyle(idx, s.rank)}>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.className}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        <TextField
                          type="number"
                          size="small"
                          value={s.bonusScore || 0}
                          onChange={(e) => handleBonusChange(s._id, Number(e.target.value))}
                          sx={{ width: 70, "& input": { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.academicScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.disciplineScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.hygieneScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.attendanceScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.lineUpScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.totalViolation}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000" }}>
                        {s.totalRankScore}
                      </TableCell>
                      <TableCell align="center" sx={{ border: "1px solid #000", fontWeight: 600 }}>
                        {s.rank}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      })}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
