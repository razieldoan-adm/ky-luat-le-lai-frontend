import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  MenuItem,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface SummaryRow {
  id: number;
  className: string;
  count: number;
  total: number;
}

export default function ClassLineUpSummaryPage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(10);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  // 🔹 Load danh sách tuần
  useEffect(() => {
    api.get("/api/academic-weeks").then((res) => setWeeks(res.data));
  }, []);

  // 🔹 Hàm load dữ liệu lineup theo tuần được chọn
  const handleLoadData = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần!");

      const week = weeks.find((w) => w._id === selectedWeek);
      if (!week) return alert("Không tìm thấy tuần!");

      // ✅ Gọi đúng route backend
      const res = await api.get("/api/class-lineup-summaries/weekly", {
        params: { weekNumber: week.weekNumber },
      });

      const data = res.data.records || [];
      const grouped: Record<string, number> = {};

      data.forEach((item: any) => {
        if (!grouped[item.className]) grouped[item.className] = 0;
        grouped[item.className]++;
      });

      const formatted = Object.keys(grouped).map((className, index) => ({
        id: index + 1,
        className,
        count: grouped[className],
        total: grouped[className] * multiplier,
      }));

      setSummaries(formatted);
    } catch (err) {
      console.error("Lỗi load lineup:", err);
      alert("Không thể tải dữ liệu lineup của tuần!");
    }
  };

  // 🔹 Lưu điểm tổng vào ClassWeeklyScore
  const handleSave = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần trước khi lưu!");
      const week = weeks.find((w) => w._id === selectedWeek);
      if (!week) return alert("Không tìm thấy tuần!");

      for (const s of summaries) {
        await api.post("/api/class-lineup-summaries/update-weekly-score", {
          className: s.className,
          weekNumber: week.weekNumber,
          lineUpScore: s.total,
        });
      }

      alert("✅ Đã lưu điểm lineup của tất cả lớp!");
    } catch (err) {
      console.error("Lỗi khi lưu điểm lineup:", err);
      alert("❌ Lưu thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Tổng điểm xếp hàng các lớp theo tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          select
          label="Tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {weeks.map((week) => (
            <MenuItem key={week._id} value={week._id}>
              Tuần {week.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Hệ số điểm"
          type="number"
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          sx={{ width: 120 }}
        />

        <Button variant="contained" onClick={handleLoadData}>
          LOAD DỮ LIỆU
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          LƯU
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Số lần vi phạm</TableCell>
              <TableCell>Hệ số</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{multiplier}</TableCell>
                <TableCell>{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
