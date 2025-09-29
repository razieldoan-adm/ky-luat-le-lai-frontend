import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from "@mui/material";
import api from "../../api/api"; 
import * as XLSX from "xlsx";

interface Score {
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
  ranking: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<Score[]>([]);
  const [saved, setSaved] = useState(false); // có dữ liệu DB chưa
  const [changed, setChanged] = useState(false); // backend báo raw-data khác DB
  const [loading, setLoading] = useState(false);

  // Lấy danh sách tuần
  useEffect(() => {
    axios.get("/api/study-weeks").then((res) => {
      setWeeks(res.data.map((w: any) => w.weekNumber));
    });
  }, []);

  // Load dữ liệu từ DB khi chọn tuần
  useEffect(() => {
    if (!selectedWeek) return;

    setLoading(true);
    axios
      .get(`/api/weekly-scores?weekNumber=${selectedWeek}`)
      .then((res) => {
        if (res.data.length > 0) {
          setScores(res.data);
          setSaved(true);
          // check thay đổi
          axios
            .get(`/api/weekly-scores/check-changes/${selectedWeek}`)
            .then((check) => setChanged(check.data.changed));
        } else {
          setScores([]);
          setSaved(false);
          setChanged(false);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  // Tính lại xếp hạng
  const recalcRanking = (list: Score[]) => {
    const sorted = [...list].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore: number | null = null;
    let count = 0;

    sorted.forEach((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      s.ranking = currentRank;
    });

    return sorted;
  };

  // Load dữ liệu temp
  const loadTemp = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/weekly-scores/temp?weekNumber=${selectedWeek}`
      );
      setScores(res.data);
      setSaved(false);
      setChanged(false);
    } finally {
      setLoading(false);
    }
  };

  // Tính xếp hạng (frontend)
  const calcRanking = () => {
    const recalculated = scores.map((s) => ({
      ...s,
      totalScore: (s.academicScore || 0) + (s.bonusScore || 0) + (s.totalViolation || 0),
    }));
    setScores(recalcRanking(recalculated));
  };

  // Lưu dữ liệu
  const saveScores = async () => {
    if (!selectedWeek) return;
    await axios.post("/api/weekly-scores/save", {
      weekNumber: selectedWeek,
      scores,
    });
    setSaved(true);
    alert("Đã lưu thành công");
  };

  // Cập nhật dữ liệu khi raw-data thay đổi
  const updateScores = async () => {
    if (!selectedWeek) return;
    const res = await axios.post(
      `/api/weekly-scores/update/${selectedWeek}`
    );
    setScores(res.data);
    setSaved(true);
    setChanged(false);
  };

  // Xuất Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(scores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeeklyScores");
    XLSX.writeFile(wb, `WeeklyScores_Week${selectedWeek}.xlsx`);
  };

  // Chỉnh tay học tập / thưởng
  const handleChange = (idx: number, field: "academicScore" | "bonusScore", value: number) => {
    const updated = [...scores];
    updated[idx][field] = value;
    updated[idx].totalScore =
      (updated[idx].academicScore || 0) +
      (updated[idx].bonusScore || 0) +
      (updated[idx].totalViolation || 0);
    setScores(recalcRanking(updated));
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Điểm thi đua theo tuần
      </Typography>

      {/* Chọn tuần */}
      <Box mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value="">Chọn tuần</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Nút thao tác */}
      <Box mb={2}>
        {!saved && (
          <Button
            onClick={loadTemp}
            variant="contained"
            sx={{ mr: 2 }}
            disabled={!selectedWeek}
          >
            Load dữ liệu
          </Button>
        )}
        {scores.length > 0 && (
          <>
            <Button
              onClick={calcRanking}
              variant="outlined"
              sx={{ mr: 2 }}
            >
              Tính xếp hạng
            </Button>
            <Button
              onClick={saveScores}
              variant="contained"
              color="success"
              sx={{ mr: 2 }}
            >
              Lưu
            </Button>
            {changed && (
              <Button
                onClick={updateScores}
                variant="contained"
                color="warning"
                sx={{ mr: 2 }}
              >
                Cập nhật
              </Button>
            )}
            <Button onClick={exportExcel} variant="outlined" color="primary">
              Xuất Excel
            </Button>
          </>
        )}
      </Box>

      {/* Bảng dữ liệu */}
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
              <TableCell>Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s, idx) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={s.academicScore}
                    onChange={(e) =>
                      handleChange(idx, "academicScore", Number(e.target.value))
                    }
                    style={{ width: "60px" }}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={s.bonusScore}
                    onChange={(e) =>
                      handleChange(idx, "bonusScore", Number(e.target.value))
                    }
                    style={{ width: "60px" }}
                  />
                </TableCell>
                <TableCell>{s.violationScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.lineUpScore}</TableCell>
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalScore}</TableCell>
                <TableCell>{s.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WeeklyScoresPage;
