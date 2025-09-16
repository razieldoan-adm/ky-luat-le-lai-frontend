// src/pages/emulation/WeeklyScoresPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

// ===== Types =====
interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface RawScore {
  className: string;
  grade: string;
  score: number;
}

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalRankScore: number;
  rank?: number;
}

// ===== Component =====
export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  // raw data từ 4 bảng
  const [attendance, setAttendance] = useState<RawScore[]>([]);
  const [hygiene, setHygiene] = useState<RawScore[]>([]);
  const [lineup, setLineup] = useState<RawScore[]>([]);
  const [violations, setViolations] = useState<RawScore[]>([]);

  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // ===== Fetch Weeks + Settings =====
  useEffect(() => {
    fetchWeeks();
    fetchSettings();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0].weekNumber);
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Không tải được danh sách tuần.", severity: "error" });
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) setDisciplineMax(res.data.disciplineMax);
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  // ===== Fetch 4 bảng khi đổi tuần =====
  useEffect(() => {
    if (selectedWeek) {
      fetchAttendance();
      fetchHygiene();
      fetchLineUp();
      fetchViolations();
    }
  }, [selectedWeek]);

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/api/classattendancesummaries", { params: { weekNumber: selectedWeek } });
      setAttendance(res.data);
    } catch (err) {
      console.error("Lỗi khi load attendance:", err);
    }
  };

  const fetchHygiene = async () => {
    try {
      const res = await api.get("/api/classhygienescores", { params: { weekNumber: selectedWeek } });
      setHygiene(res.data);
    } catch (err) {
      console.error("Lỗi khi load hygiene:", err);
    }
  };

  const fetchLineUp = async () => {
    try {
      const res = await api.get("/api/classlineupsummaries", { params: { weekNumber: selectedWeek } });
      setLineup(res.data);
    } catch (err) {
      console.error("Lỗi khi load lineup:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/classviolationscores", { params: { weekNumber: selectedWeek } });
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi khi load violations:", err);
    }
  };

  // ===== Gom dữ liệu thô từ 4 bảng =====
  const mergedScores: WeeklyScore[] = useMemo(() => {
    const map: Record<string, WeeklyScore> = {};

    const addData = (
      arr: RawScore[],
      key: "disciplineScore" | "hygieneScore" | "attendanceScore" | "lineUpScore"
    ) => {
      arr.forEach((item) => {
        if (!map[item.className]) {
          map[item.className] = {
            className: item.className,
            grade: item.grade,
            weekNumber: selectedWeek || 0,
            academicScore: 0,
            bonusScore: 0,
            disciplineScore: 0,
            hygieneScore: 0,
            attendanceScore: 0,
            lineUpScore: 0,
            totalViolation: 0,
            totalRankScore: 0,
          };
        }
        (map[item.className][key] as number) = item.score ?? 0;
      });
    };

    addData(attendance, "attendanceScore");
    addData(hygiene, "hygieneScore");
    addData(lineup, "lineUpScore");
    addData(violations, "disciplineScore");

    return Object.values(map);
  }, [attendance, hygiene, lineup, violations, selectedWeek]);

  // ===== Tính toán totals & ranks =====
  useEffect(() => {
    const computed = mergedScores.map((s) => {
      const totalViolation = disciplineMax - (s.disciplineScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
      const totalRankScore = s.academicScore + totalViolation + s.bonusScore;
      return { ...s, totalViolation, totalRankScore };
    });

    // Rank theo khối
    const byGrade: Record<string, WeeklyScore[]> = {};
    computed.forEach((s) => {
      if (!byGrade[s.grade]) byGrade[s.grade] = [];
      byGrade[s.grade].push(s);
    });

    Object.keys(byGrade).forEach((g) => {
      const sorted = [...byGrade[g]].sort((a, b) => b.totalRankScore - a.totalRankScore);
      sorted.forEach((s, i) => {
        const idx = computed.findIndex((c) => c.className === s.className);
        if (idx !== -1) computed[idx].rank = i + 1;
      });
    });

    setScores(computed);
  }, [mergedScores, disciplineMax]);

  // ===== Handlers =====
  const handleChangeScore = (className: string, field: "academicScore" | "bonusScore", value: number) => {
    const updated = scores.map((s) =>
      s.className === className ? { ...s, [field]: value } : s
    );
    setScores(updated);
  };

  const getRowStyle = (idx: number, rank?: number) => {
    let style: any = { backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9" };
    if (rank === 1) style.backgroundColor = "#ffe082";
    if (rank === 2) style.backgroundColor = "#b2ebf2";
    if (rank === 3) style.backgroundColor = "#c8e6c9";
    return style;
  };

  // ===== UI =====
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      {/* chọn tuần */}
      <TextField
        select
        label="Chọn tuần"
        value={selectedWeek ?? ""}
        onChange={(e) => setSelectedWeek(Number(e.target.value))}
        sx={{ width: 300, mb: 2 }}
        size="small"
      >
        {weeks.map((w) => (
          <MenuItem key={w._id} value={w.weekNumber}>
            Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} -{" "}
            {new Date(w.endDate).toLocaleDateString()})
          </MenuItem>
        ))}
      </TextField>

      {/* bảng */}
      <Paper elevation={3} sx={{ width: "100%", overflowX: "auto", borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Kỷ luật (-)</TableCell>
              <TableCell>Vệ sinh (-)</TableCell>
              <TableCell>Chuyên cần (-)</TableCell>
              <TableCell>Xếp hàng (-)</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng xếp hạng</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {scores.length > 0 ? (
              scores.map((s, i) => (
                <TableRow key={s.className} sx={getRowStyle(i, s.rank)}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.academicScore}
                      onChange={(e) =>
                        handleChangeScore(s.className, "academicScore", Number(e.target.value))
                      }
                      sx={{ width: 70, "& input": { textAlign: "center" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.bonusScore}
                      onChange={(e) =>
                        handleChangeScore(s.className, "bonusScore", Number(e.target.value))
                      }
                      sx={{ width: 70, "& input": { textAlign: "center" } }}
                    />
                  </TableCell>
                  <TableCell align="center">{s.disciplineScore}</TableCell>
                  <TableCell align="center">{s.hygieneScore}</TableCell>
                  <TableCell align="center">{s.attendanceScore}</TableCell>
                  <TableCell align="center">{s.lineUpScore}</TableCell>
                  <TableCell align="center">{s.totalViolation}</TableCell>
                  <TableCell align="center">{s.totalRankScore}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {s.rank ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

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
