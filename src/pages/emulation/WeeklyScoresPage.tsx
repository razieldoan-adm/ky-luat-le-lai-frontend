import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";

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

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedData, setSavedData] = useState<Score[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // giả sử tuần = 1..40
    const list = Array.from({ length: 40 }, (_, i) => i + 1);
    setWeeks(list);
  }, []);

  const fetchSavedScores = async (week: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/weekly-scores?weekNumber=${week}`);
      setScores(res.data || []);
      setSavedData(res.data || []);
      setShowSave(false);
      setShowUpdate(false);

      if (!res.data || res.data.length === 0) {
        // nếu chưa có dữ liệu thì hiển thị nút Load
        setScores([]);
      } else {
        // nếu có rồi thì check có thay đổi so với dữ liệu tạm không
        const check = await axios.get(`/api/weekly-scores/check-changes/${week}`);
        setShowUpdate(check.data.changed);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLoadTemp = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/weekly-scores/temp?weekNumber=${selectedWeek}`);
      setScores(res.data || []);
      setShowSave(false);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleRank = () => {
    if (!scores.length) return;
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore: number | null = null;
    let count = 0;
    ranked.forEach((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      s.ranking = currentRank;
    });
    setScores(ranked);
    setShowSave(true);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      await axios.post("/api/weekly-scores/save", {
        weekNumber: selectedWeek,
        scores,
      });
      await fetchSavedScores(selectedWeek); // load lại bản đã lưu
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await axios.post(`/api/weekly-scores/update/${selectedWeek}`);
      setScores(res.data || []);
      setSavedData(res.data || []);
      setShowSave(false);
      setShowUpdate(false);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bảng điểm thi đua tuần</h2>

      <div style={{ marginBottom: 20 }}>
        <Select
          value={selectedWeek}
          onChange={(e) => {
            const week = e.target.value as number;
            setSelectedWeek(week);
            fetchSavedScores(week);
          }}
          displayEmpty
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </div>

      {loading && <CircularProgress />}

      {selectedWeek && !loading && (
        <div style={{ marginBottom: 20 }}>
          {scores.length === 0 ? (
            <Button variant="contained" onClick={handleLoadTemp}>
              Load dữ liệu
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={handleRank}
                style={{ marginRight: 10 }}
              >
                Tính hạng
              </Button>
              {showSave && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSave}
                  style={{ marginRight: 10 }}
                >
                  Lưu
                </Button>
              )}
              {showUpdate && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleUpdate}
                >
                  Cập nhật
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm chuyên cần</TableCell>
              <TableCell>Điểm vệ sinh</TableCell>
              <TableCell>Điểm xếp hàng</TableCell>
              <TableCell>Điểm vi phạm</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Tổng vi phạm</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Hạng</TableCell>
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
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalScore}</TableCell>
                <TableCell>{s.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default WeeklyScoresPage;
