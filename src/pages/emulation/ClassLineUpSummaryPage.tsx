import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
  CircularProgress,
} from "@mui/material";
import api from "../../api/api";

const ClassLineUpSummaryPage = () => {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/academic-weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("Lỗi khi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Load dữ liệu xếp hàng
  const handleLoadData = async () => {
    if (!selectedWeek) return alert("Vui lòng chọn tuần!");
    setLoading(true);
    try {
      const res = await api.get("/api/class-lineup-summary", {
        params: { weekNumber: selectedWeek },
      });

      // Gom nhóm theo lớp
      const grouped = {};
      res.data.forEach((item) => {
        if (!grouped[item.className]) grouped[item.className] = [];
        grouped[item.className].push(item.scoreChange || 0);
      });

      const result = Object.keys(grouped).map((className, idx) => {
        const scores = grouped[className];
        const total = scores.reduce((sum, s) => sum + s, 0);
        return {
          id: idx + 1,
          className,
          scores,
          total,
          count: scores.length,
        };
      });

      setData(result);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lưu vào ClassWeeklyScore
  const handleSave = async () => {
    if (!selectedWeek) return alert("Chưa chọn tuần!");
    try {
      for (const row of data) {
        await api.post("/api/class-weekly-score/update-lineup", {
          className: row.className,
          weekNumber: selectedWeek,
          lineUpScore: row.total,
        });
      }
      alert("Đã lưu điểm xếp hàng vào ClassWeeklyScore!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Tổng điểm xếp hàng các lớp theo tuần
      </Typography>

      {/* Bộ chọn tuần */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          select
          label="Tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ width: 180 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={handleLoadData}>
          LOAD DỮ LIỆU
        </Button>

        <Button variant="contained" color="success" onClick={handleSave}>
          LƯU
        </Button>
      </Stack>

      <Paper sx={{ mt: 2 }}>
        {loading ? (
          <Box p={3} textAlign="center">
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1976d2" }}>
                <TableCell sx={{ color: "white" }}>STT</TableCell>
                <TableCell sx={{ color: "white" }}>Lớp</TableCell>
                <TableCell sx={{ color: "white" }}>Điểm xếp hàng</TableCell>
                <TableCell sx={{ color: "white" }}>Tổng điểm</TableCell>
                <TableCell sx={{ color: "white" }}>Số lượt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.scores.join(", ")}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default ClassLineUpSummaryPage;
