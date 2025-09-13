import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
}

interface Score {
  _id: string;
  grade: string;
  className: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore: number;
  totalViolation: number;
  totalRankScore: number;
  rank: number;
}

interface ClassData {
  _id: string;
  className: string;
  homeroomTeacher?: string;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [classList, setClassList] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info",
  });

  // gọi API lấy tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/weeks");
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  // gọi API lấy lớp
  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  // gọi API lấy điểm
  const fetchScores = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      const list: Score[] = res.data.map((s: Score) => ({
        ...s,
        bonusScore: s.bonusScore ?? 0,
      }));

      // lọc chỉ lớp có GVCN
      const filtered = list.filter((s) =>
        classList.some(
          (c) => c.className === s.className && c.homeroomTeacher
        )
      );

      // tính toán lại xếp hạng trong từng khối
      const withRanks = assignRanksPerGrade(filtered);
      setScores(withRanks);

      if (filtered.length === 0) {
        setSnackbar({
          open: true,
          message: "Chưa có dữ liệu tuần này.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
    } finally {
      setLoading(false);
    }
  };

  // tính xếp hạng theo từng khối
  const assignRanksPerGrade = (data: Score[]) => {
    const grouped: { [key: string]: Score[] } = {};
    data.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    const ranked: Score[] = [];
    Object.keys(grouped).forEach((grade) => {
      const sorted = grouped[grade].sort(
        (a, b) => b.totalRankScore - a.totalRankScore
      );
      sorted.forEach((s, idx) => {
        ranked.push({ ...s, rank: idx + 1 });
      });
    });
    return ranked;
  };

  // thay đổi điểm thưởng
  const handleBonusChange = (id: string, value: number) => {
    setScores((prev) =>
      prev.map((s) =>
        s._id === id
          ? {
              ...s,
              bonusScore: value,
              totalRankScore:
                s.academicScore +
                s.disciplineScore +
                s.hygieneScore +
                s.attendanceScore +
                s.lineUpScore +
                value,
            }
          : s
      )
    );
  };

  // style zebra table + highlight hạng 1
  const getRowStyle = (index: number, rank: number) => {
    if (rank === 1) {
      return { backgroundColor: "#fff9c4" }; // vàng nhạt cho lớp hạng 1
    }
    return {
      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff", // zebra
    };
  };

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedWeek) fetchScores();
  }, [selectedWeek, classList]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Grid container spacing={2} alignItems="center" mb={2}>
        <Grid item>
          <Select
            value={selectedWeek?._id || ""}
            onChange={(e) =>
              setSelectedWeek(
                weeks.find((w) => w._id === e.target.value) || null
              )
            }
            size="small"
          >
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w._id}>
                Tuần {w.weekNumber}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            onClick={fetchScores}
            disabled={loading || !selectedWeek}
          >
            {loading ? <CircularProgress size={20} /> : "Làm mới"}
          </Button>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">#</TableCell>
              <TableCell align="center">Khối</TableCell>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">SĐB</TableCell>
              <TableCell align="center">Kỷ luật</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Chuyên cần</TableCell>
              <TableCell align="center">Nghỉ hàng</TableCell>
              <TableCell align="center">Vi phạm</TableCell>
              <TableCell align="center">Thưởng</TableCell>
              <TableCell align="center">Tổng điểm</TableCell>
              <TableCell align="center">Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s, idx) => (
              <TableRow key={s._id} sx={getRowStyle(idx, s.rank)}>
                <TableCell align="center">{idx + 1}</TableCell>
                <TableCell align="center">{s.grade}</TableCell>
                <TableCell align="center">{s.className}</TableCell>
                <TableCell align="center">{s.academicScore}</TableCell>
                <TableCell align="center">{s.disciplineScore}</TableCell>
                <TableCell align="center">{s.hygieneScore}</TableCell>
                <TableCell align="center">{s.attendanceScore}</TableCell>
                <TableCell align="center">{s.lineUpScore}</TableCell>
                <TableCell align="center">{s.totalViolation}</TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={s.bonusScore}
                    onChange={(e) =>
                      handleBonusChange(s._id, Number(e.target.value) || 0)
                    }
                    sx={{ width: 70, "& input": { textAlign: "center" } }}
                  />
                </TableCell>
                <TableCell align="center">{s.totalRankScore}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  {s.rank}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklyScoresPage;
