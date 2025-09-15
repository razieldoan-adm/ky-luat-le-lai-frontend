import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface Score {
  _id?: string;
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalScore?: number;
  rank?: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);

  // giả sử tuần 1 → 20
  useEffect(() => {
    const weekList = Array.from({ length: 20 }, (_, i) => i + 1);
    setWeeks(weekList);
  }, []);

  const handleAggregate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post("/weekly-scores/calculate", {
        weekNumber: selectedWeek,
      });
      setScores(res.data);
    } catch (err) {
      console.error("Aggregate error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get("/weekly-scores", {
        params: { weekNumber: selectedWeek },
      });
      setScores(res.data);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/weekly-scores/save", {
        weekNumber: selectedWeek,
        scores,
      });
      alert("Đã lưu điểm tuần");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Điểm Thi Đua Tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <FormControl size="small">
          <InputLabel>Chọn Tuần</InputLabel>
          <Select
            value={selectedWeek}
            label="Chọn Tuần"
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            style={{ minWidth: 120 }}
          >
            {weeks.map((w) => (
              <MenuItem key={w} value={w}>
                Tuần {w}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="secondary"
          onClick={handleAggregate}
          disabled={!selectedWeek || loading}
        >
          GOM DỮ LIỆU
        </Button>

        <Button
          variant="contained"
          color="info"
          onClick={handleLoad}
          disabled={!selectedWeek || loading}
        >
          TẢI DỮ LIỆU
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={!selectedWeek || scores.length === 0}
        >
          LƯU
        </Button>
      </Stack>

      {scores.length === 0 ? (
        <Typography color="text.secondary">
          {selectedWeek
            ? "Chưa có dữ liệu tuần này. Bấm 'GOM DỮ LIỆU' để tính."
            : "Hãy chọn tuần để xem dữ liệu."}
        </Typography>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Khối</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Kỷ luật</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Điểm danh</TableCell>
                <TableCell>Tổng nề nếp</TableCell>
                <TableCell>Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell>{s.academicScore}</TableCell>
                  <TableCell>{s.bonusScore}</TableCell>
                  <TableCell>{s.disciplineScore}</TableCell>
                  <TableCell>{s.hygieneScore}</TableCell>
                  <TableCell>{s.attendanceScore}</TableCell>
                  <TableCell>{s.lineUpScore}</TableCell>
                  <TableCell>{s.totalScore}</TableCell>
                  <TableCell>{s.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
