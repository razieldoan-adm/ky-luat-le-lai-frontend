import React, { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import api from "../../api/api";

// Kiểu dữ liệu tuần
interface Week {
  weekNumber: number;
  name: string;
}

// Kiểu dữ liệu 1 dòng điểm
interface ScoreRow {
  className: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loaded" | "calculated" | "saved" | "needsUpdate"
  >("idle");

  // Lấy dữ liệu tuần
  const fetchWeeks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const initialWeek: Week = res.data[0];
      setSelectedWeek(initialWeek);
      if (initialWeek) {
        await initializeData(initialWeek.weekNumber);
      }
    } catch (err) {
      console.error("Error fetching weeks:", err);
    }
    setLoading(false);
  };

  // Khởi tạo dữ liệu theo tuần
  const initializeData = async (weekNumber: number) => {
    setLoading(true);
    try {
      const savedRes = await api.get(
        `/api/class-weekly-scores?weekNumber=${weekNumber}`
      );
      if (savedRes.data.length > 0) {
        setScores(savedRes.data);
        setStatus("saved");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("Error initializing data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  // Load dữ liệu tạm
  const handleLoadTemp = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/api/class-weekly-scores/temp?weekNumber=${selectedWeek.weekNumber}`
      );
      setScores(res.data);
      setStatus("loaded");
    } catch (err) {
      console.error("Error loading temp scores:", err);
    }
    setLoading(false);
  };

  // Tính xếp hạng
  const handleCalculate = () => {
    const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore = null;
    let count = 0;
    const ranked = sorted.map((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      return { ...s, ranking: currentRank };
    });
    setScores(ranked);
    setStatus("calculated");
  };

  // Cập nhật dữ liệu từ DB
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/api/class-weekly-scores/update/${selectedWeek.weekNumber}`
      );
      setScores(res.data);
      setStatus("calculated");
    } catch (err) {
      console.error("Error updating weekly scores:", err);
    }
    setLoading(false);
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      await api.post(`/api/class-weekly-scores/save`, {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setStatus("saved");
    } catch (err) {
      console.error("Error saving weekly scores:", err);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Quản lý điểm tuần</h2>
      {loading && <CircularProgress />}

      <div style={{ marginBottom: 16 }}>
        {status === "idle" && (
          <Button variant="contained" onClick={handleLoadTemp}>
            Load dữ liệu
          </Button>
        )}
        {status === "loaded" && (
          <Button variant="contained" onClick={handleCalculate}>
            Tính xếp hạng
          </Button>
        )}
        {status === "calculated" && (
          <Button variant="contained" onClick={handleSave}>
            Lưu
          </Button>
        )}
        {status === "saved" && (
          <Button variant="outlined" disabled>
            Đã lưu
          </Button>
        )}
        {status === "needsUpdate" && (
          <Button variant="contained" onClick={handleUpdate}>
            Cập nhật
          </Button>
        )}
      </div>

      <TableContainer component={Paper}>
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
              <TableCell>Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((row) => (
              <TableRow key={row.className}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.academicScore}</TableCell>
                <TableCell>{row.bonusScore}</TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.lineUpScore}</TableCell>
                <TableCell>{row.totalViolation}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
                <TableCell>{row.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default WeeklyScoresPage;
