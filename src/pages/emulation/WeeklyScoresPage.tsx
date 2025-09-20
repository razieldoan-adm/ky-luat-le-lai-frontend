import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  MenuItem,
  TextField,
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
  studentName: string;
  className: string;
  grade?: number; // có thể undefined nếu API chưa trả
  total: number;
}

const WeeklyScoresPage = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      checkAndLoadData(selectedWeek.weekNumber);
    }
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi load tuần:", err);
    }
  };

  const checkAndLoadData = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber },
      });
      const data = res.data || [];
      if (data.length > 0) {
        // đã có dữ liệu trong DB
        setHasData(true);
        setScores(data);
      } else {
        // chưa có dữ liệu
        setHasData(false);
        setScores([]);
      }
    } catch (err) {
      console.error("Lỗi kiểm tra dữ liệu:", err);
      setHasData(false);
      setScores([]);
    }
  };

  const handleLoadData = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.post("/api/class-lineup-summaries/load", {
        weekNumber: selectedWeek.weekNumber,
      });
      setScores(res.data || []);
      setHasData(true); // sau khi load lần đầu coi như đã có dữ liệu
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
    }
  };

  const handleUpdateData = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.put("/api/class-lineup-summaries/update", {
        weekNumber: selectedWeek.weekNumber,
      });
      setScores(res.data || []);
      setHasData(true);
    } catch (err) {
      console.error("Lỗi khi cập nhật dữ liệu:", err);
    }
  };

  // nhóm điểm theo grade, nếu thiếu grade thì cố gắng parse từ className
  const groupedByGrade = scores.reduce((acc, item) => {
    let grade = item.grade;
    if (!grade && item.className) {
      const match = item.className.match(/^(\d+)/); // lấy số đầu của tên lớp
      if (match) grade = parseInt(match[1], 10);
    }
    if (!grade) grade = -1; // fallback cho lỗi
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(item);
    return acc;
  }, {} as Record<number, Score[]>);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Điểm thi đua theo tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
            </MenuItem>
          ))}
        </TextField>

        {!hasData && (
          <Button variant="contained" onClick={handleLoadData} disabled={!selectedWeek}>
            Load dữ liệu
          </Button>
        )}
        {hasData && (
          <Button variant="contained" color="success" onClick={handleUpdateData}>
            Cập nhật dữ liệu
          </Button>
        )}
      </Stack>

      {Object.entries(groupedByGrade).map(([grade, list]) => {
        const sorted = [...list].sort((a, b) => b.total - a.total);
        return (
          <Paper key={grade} sx={{ mb: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {grade === "-1" ? "Khối chưa xác định" : `Khối ${grade}`}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hạng</TableCell>
                  <TableCell>Học sinh</TableCell>
                  <TableCell>Lớp</TableCell>
                  <TableCell>Điểm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((s, idx) => (
                  <TableRow key={s._id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{s.studentName}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        );
      })}
    </Box>
  );
};

export default WeeklyScoresPage;
