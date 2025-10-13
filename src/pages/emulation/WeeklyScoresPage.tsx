import React, { useEffect, useState } from "react";
import {
  Box, Typography, CircularProgress, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import api from "@/api"; // hoặc đường dẫn tới axios instance của bạn

interface ClassWeeklyScore {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  hygieneScore: number;
  lineupScore: number;
  violationScore: number;
  attendanceScore: number;
  academicScore: number;
  rewardScore: number;
  disciplineScore?: number;
  totalScore?: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("Tất cả");
  const [scores, setScores] = useState<ClassWeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ maxDiscipline: number }>({ maxDiscipline: 100 });

  // --- Load danh sách tuần & tuần hiện tại
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/weekly-scores/weeks");
        setWeeks(res.data || []);
        const current = Math.max(...(res.data || []));
        setSelectedWeek(current);
        loadScores(current);
      } catch (err) {
        console.error("Lỗi khi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // --- Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // --- Load cấu hình hệ thống
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings({ maxDiscipline: res.data?.maxDiscipline ?? 100 });
      } catch {
        setSettings({ maxDiscipline: 100 });
      }
    };
    loadSettings();
  }, []);

  // --- Load điểm tuần
  const loadScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/weekly-scores/weekly`, { params: { weekNumber } });
      let data: ClassWeeklyScore[] = res.data || [];

      // Tính điểm kỷ luật và tổng thi đua
      data = data.map((item) => {
        const discipline = settings.maxDiscipline -
          ((item.attendanceScore ?? 0) * 5 +
            (item.violationScore ?? 0) +
            (item.hygieneScore ?? 0) +
            (item.lineupScore ?? 0));
        const total = discipline + (item.rewardScore ?? 0) + (item.academicScore ?? 0);
        return { ...item, disciplineScore: discipline, totalScore: total };
      });

      // Xếp hạng
      data.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
      data.forEach((d, i) => (d.rank = i + 1));

      setScores(data);
    } catch (err) {
      console.error("Lỗi khi tải điểm:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Khi đổi tuần
  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const w = Number(e.target.value);
    setSelectedWeek(w);
    loadScores(w);
  };

  // --- Khi đổi lớp
  const handleClassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedClass(e.target.value);
  };

  // --- Khi sửa điểm học tập hoặc thưởng
  const handleChangeScore = (className: string, field: keyof ClassWeeklyScore, value: number) => {
    setScores((prev) =>
      prev.map((s) =>
        s.className === className ? { ...s, [field]: value } : s
      )
    );
  };

  // --- Lưu toàn bộ điểm
  const handleSave = async () => {
    try {
      for (const s of scores) {
        await api.post("/api/weekly-scores/update", s);
      }
      alert("✅ Đã lưu toàn bộ điểm tuần!");
      loadScores(Number(selectedWeek));
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("❌ Lỗi khi lưu dữ liệu");
    }
  };

  // --- Xuất Excel
  const handleExport = () => {
    if (!selectedWeek) return;
    window.open(`/api/weekly-scores/export/${selectedWeek}`, "_blank");
  };

  // --- Lọc lớp hiển thị
  const filteredScores =
    selectedClass === "Tất cả"
      ? scores
      : scores.filter((s) => s.className === selectedClass);

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        🏫 Tổng hợp điểm thi đua các lớp
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Tuần học"
          value={selectedWeek}
          onChange={handleWeekChange}
          sx={{ width: 160 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Lọc theo lớp"
          value={selectedClass}
          onChange={handleClassChange}
          sx={{ width: 180 }}
        >
          <MenuItem value="Tất cả">Tất cả</MenuItem>
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" color="primary" onClick={handleSave}>
          💾 Lưu điểm
        </Button>
        <Button variant="outlined" color="success" onClick={handleExport}>
          📤 Xuất Excel
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell align="center">Vệ sinh</TableCell>
                <TableCell align="center">Xếp hàng</TableCell>
                <TableCell align="center">Vi phạm</TableCell>
                <TableCell align="center">Chuyên cần</TableCell>
                <TableCell align="center">Học tập</TableCell>
                <TableCell align="center">Thưởng</TableCell>
                <TableCell align="center">Tổng kỷ luật</TableCell>
                <TableCell align="center">Tổng thi đua</TableCell>
                <TableCell align="center">Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScores.map((row) => (
                <TableRow key={row.className}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell align="center">{row.hygieneScore}</TableCell>
                  <TableCell align="center">{row.lineupScore}</TableCell>
                  <TableCell align="center">{row.violationScore}</TableCell>
                  <TableCell align="center">{row.attendanceScore}</TableCell>

                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.academicScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "academicScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.rewardScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "rewardScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>

                  <TableCell align="center">{row.disciplineScore?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.totalScore?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
