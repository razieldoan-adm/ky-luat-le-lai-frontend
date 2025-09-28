import React, { useEffect, useState } from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Paper, Typography
} from "@mui/material";
import * as XLSX from "xlsx";
import axios from "axios";

interface WeeklyScore {
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

type PageState = "idle" | "loaded" | "temp" | "ranked" | "saved" | "updated";

const WeeklyScoresPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [status, setStatus] = useState<PageState>("idle");

  // ===== Helper: tính hạng =====
  const calculateRanking = (list: WeeklyScore[]): WeeklyScore[] => {
    const sorted = [...list].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore: number | null = null;
    let count = 0;
    return sorted.map((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      return { ...s, ranking: currentRank };
    });
  };

  // ===== Khi load trang =====
  useEffect(() => {
    if (!weekNumber) return;
    axios
      .get(`/api/weekly-scores?weekNumber=${weekNumber}`)
      .then(async (res) => {
        if (res.data && res.data.length > 0) {
          setScores(res.data);
          setStatus("loaded");
          // Kiểm tra xem raw-data có thay đổi không
          const chk = await axios.get(`/api/weekly-scores/check/${weekNumber}`);
          if (chk.data.changed) setStatus("updated");
        } else {
          setStatus("idle");
        }
      })
      .catch((err) => console.error(err));
  }, [weekNumber]);

  // ===== Load dữ liệu tạm =====
  const handleLoadTemp = async () => {
    try {
      const res = await axios.get(`/api/weekly-scores/temp?weekNumber=${weekNumber}`);
      setScores(res.data);
      setStatus("temp");
    } catch (err) {
      console.error(err);
    }
  };

  // ===== Cập nhật khi có raw-data mới =====
  const handleUpdate = async () => {
    try {
      const res = await axios.post(`/api/weekly-scores/update/${weekNumber}`);
      setScores(res.data);
      setStatus("temp"); // cần tính hạng lại
    } catch (err) {
      console.error(err);
    }
  };

  // ===== Tính hạng =====
  const handleCalculate = () => {
    const updated = scores.map((s) => ({
      ...s,
      totalScore: s.academicScore + s.bonusScore + s.totalViolation,
    }));
    const ranked = calculateRanking(updated);
    setScores(ranked);
    setStatus("ranked");
  };

  // ===== Lưu =====
  const handleSave = async () => {
    try {
      await axios.post(`/api/weekly-scores/save`, {
        weekNumber,
        scores,
      });
      setStatus("saved");
    } catch (err) {
      console.error(err);
    }
  };

  // ===== Xuất Excel =====
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(scores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeeklyScores");
    XLSX.writeFile(wb, `WeeklyScores_Week${weekNumber}.xlsx`);
  };

  // ===== Chỉnh tay điểm Học tập / Thưởng =====
  const handleChangeScore = (index: number, field: "academicScore" | "bonusScore", value: number) => {
    const newScores = [...scores];
    newScores[index][field] = value;
    newScores[index].totalScore =
      newScores[index].academicScore +
      newScores[index].bonusScore +
      newScores[index].totalViolation;
    const ranked = calculateRanking(newScores);
    setScores(ranked);
    setStatus("ranked");
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Điểm thi đua tuần {weekNumber}
      </Typography>

      <div style={{ marginBottom: 16 }}>
        {status === "idle" && (
          <Button variant="contained" onClick={handleLoadTemp}>
            Load dữ liệu
          </Button>
        )}

        {status === "temp" && (
          <Button variant="contained" onClick={handleCalculate}>
            Tính xếp hạng
          </Button>
        )}

        {status === "ranked" && (
          <Button variant="contained" color="success" onClick={handleSave}>
            Lưu
          </Button>
        )}

        {status === "updated" && (
          <Button variant="contained" color="warning" onClick={handleUpdate}>
            Cập nhật
          </Button>
        )}

        {scores.length > 0 && (
          <Button
            variant="outlined"
            color="primary"
            onClick={handleExport}
            sx={{ ml: 2 }}
          >
            Xuất Excel
          </Button>
        )}
      </div>

      {scores.length > 0 && (
        <Table size="small" sx={{ border: "1px solid #ddd" }}>
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
            {scores.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.className}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) =>
                      handleChangeScore(idx, "academicScore", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={(e) =>
                      handleChangeScore(idx, "bonusScore", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">{row.violationScore}</TableCell>
                <TableCell align="center">{row.hygieneScore}</TableCell>
                <TableCell align="center">{row.attendanceScore}</TableCell>
                <TableCell align="center">{row.lineUpScore}</TableCell>
                <TableCell align="center">{row.totalViolation}</TableCell>
                <TableCell align="center">{row.totalScore}</TableCell>
                <TableCell align="center">{row.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default WeeklyScoresPage;
