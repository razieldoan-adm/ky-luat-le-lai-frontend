import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import api from "../../api/api";

interface Score {
  className: string;
  grade: string;
  weekNumber: number;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

interface Week {
  weekNumber: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 🔹 Load danh sách tuần từ backend
  const fetchWeeks = async () => {
    const res = await api.get("/api/weeks");
    setWeeks(res.data);
  };

  // 🔹 Lấy dữ liệu DB
  const fetchSavedScores = async (weekNumber: number) => {
    const res = await api.get(`/api/class-weekly-scores?weekNumber=${weekNumber}`);
    if (res.data.length > 0) {
      setScores(res.data);
      setSaved(true);
      checkWeekChanges(weekNumber);
    } else {
      setScores([]);
      setSaved(false);
    }
  };

  // 🔹 Check thay đổi dữ liệu gốc
  const checkWeekChanges = async (weekNumber: number) => {
    try {
      const res = await api.get(`/api/class-weekly-scores/check-changes/${weekNumber}`);
      setHasChanges(res.data.changed);
    } catch (err) {
      console.error("Check changes error:", err);
    }
  };

  // 🔹 Load dữ liệu tạm
  const handleLoad = async () => {
    if (!selectedWeek) return;
    const res = await api.get(`/api/class-weekly-scores/temp?weekNumber=${selectedWeek.weekNumber}`);
    setScores(res.data);
    setSaved(false);
  };

  // 🔹 Tính xếp hạng (FE)
  const handleRank = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore: number | null = null;
    let count = 0;

    const newScores = ranked.map((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      return { ...s, ranking: currentRank };
    });

    setScores(newScores);
  };

  // 🔹 Lưu DB
  const handleSave = async () => {
    if (!selectedWeek) return;
    await api.post("/api/class-weekly-scores/save", {
      weekNumber: selectedWeek.weekNumber,
      scores,
    });
    setSaved(true);
    checkWeekChanges(selectedWeek.weekNumber);
  };

  // 🔹 Cập nhật DB (merge + auto xếp hạng lại)
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    const res = await api.post(`/api/class-weekly-scores/update/${selectedWeek.weekNumber}`);
    setScores(res.data);
    setSaved(false);
    setHasChanges(false);

    // sau khi update → tự tính lại xếp hạng
    handleRank();
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchSavedScores(selectedWeek.weekNumber);
    }
  }, [selectedWeek]);

  return (
    <Box p={3}>
      <Typography variant="h5">Quản lý điểm tuần</Typography>

      {/* Chọn tuần */}
      <Box mt={2}>
        {weeks.map((w) => (
          <Button
            key={w.weekNumber}
            variant={selectedWeek?.weekNumber === w.weekNumber ? "contained" : "outlined"}
            onClick={() => setSelectedWeek(w)}
            sx={{ mr: 1 }}
          >
            Tuần {w.weekNumber}
          </Button>
        ))}
      </Box>

      {/* Nút hành động */}
      <Box display="flex" gap={2} mt={2}>
        {!scores.length && (
          <Button variant="contained" onClick={handleLoad}>
            Load dữ liệu
          </Button>
        )}

        {scores.length > 0 && scores.some((s) => !s.ranking) && (
          <Button variant="contained" color="primary" onClick={handleRank}>
            Tính xếp hạng
          </Button>
        )}

        {scores.length > 0 && scores.every((s) => s.ranking) && !saved && (
          <Button variant="contained" color="success" onClick={handleSave}>
            Lưu
          </Button>
        )}

        {saved && !hasChanges && (
          <Button variant="contained" color="inherit" disabled>
            Đã lưu
          </Button>
        )}

        {saved && hasChanges && (
          <Button variant="contained" color="warning" onClick={handleUpdate}>
            Cập nhật
          </Button>
        )}
      </Box>

      {/* Bảng điểm */}
      <Table sx={{ mt: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            <TableCell>Điểm chuyên cần</TableCell>
            <TableCell>Điểm vệ sinh</TableCell>
            <TableCell>Điểm xếp hàng</TableCell>
            <TableCell>Điểm vi phạm</TableCell>
            <TableCell>Điểm học tập</TableCell>
            <TableCell>Điểm thưởng</TableCell>
            <TableCell>Tổng điểm</TableCell>
            <TableCell>Xếp hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((s) => (
            <TableRow key={s.className}>
              <TableCell>{s.className}</TableCell>
              <TableCell>{s.attendanceScore}</TableCell>
              <TableCell>{s.hygieneScore}</TableCell>
              <TableCell>{s.lineUpScore}</TableCell>
              <TableCell>{s.violationScore}</TableCell>
              <TableCell>{s.academicScore}</TableCell>
              <TableCell>{s.bonusScore}</TableCell>
              <TableCell>{s.totalScore}</TableCell>
              <TableCell>{s.ranking || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default WeeklyScoresPage;
