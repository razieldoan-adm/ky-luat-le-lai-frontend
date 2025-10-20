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
import dayjs from "dayjs";
import api from "../../api/api";
import { getWeeksAndCurrentWeek } from "../../types/weekHelper"; // ✅ Dùng chung helper

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
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState<number>(10);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  // 🔹 Load danh sách tuần (chỉ tới tuần hiện tại)
  useEffect(() => {
    const initWeeks = async () => {
      const { weeks: weekNumbers, currentWeek } = await getWeeksAndCurrentWeek();

      // ✅ Chuyển mảng số → mảng AcademicWeek để hiển thị dropdown
      const formattedWeeks: AcademicWeek[] = weekNumbers.map((num) => ({
        _id: String(num),
        weekNumber: num,
        // 👇 Tạo start/end date giả định để hiển thị range (giống trang vi phạm)
        startDate: dayjs()
          .startOf("week")
          .add((num - 1) * 7, "day")
          .toISOString(),
        endDate: dayjs()
          .startOf("week")
          .add(num * 7 - 1, "day")
          .toISOString(),
      }));

      setWeeks(formattedWeeks);
      setCurrentWeek(currentWeek);
      setSelectedWeek(String(currentWeek));
    };
    initWeeks();
  }, []);

  // 🔹 Hàm load dữ liệu lineup theo tuần được chọn
  const handleLoadData = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần!");

      const week = weeks.find((w) => w._id === selectedWeek);
      if (!week) return alert("Không tìm thấy tuần!");

      // 🔹 1. Lấy toàn bộ lớp
      const classRes = await api.get("/api/classes");
      const allClasses = classRes.data?.classes || classRes.data || [];

      if (!Array.isArray(allClasses) || allClasses.length === 0) {
        alert("⚠️ Không có dữ liệu lớp nào!");
        return;
      }

      // 🔹 2. Lấy dữ liệu lineup trong tuần
      const res = await api.get("/api/class-lineup-summaries/weekly", {
        params: { weekNumber: week.weekNumber },
      });
      const data = res.data?.records || [];

      // 🔹 3. Gom nhóm số lần vi phạm theo lớp
      const grouped: Record<string, number> = {};
      data.forEach((item: any) => {
        if (!grouped[item.className]) grouped[item.className] = 0;
        grouped[item.className]++;
      });

      // 🔹 4. Kết hợp toàn bộ lớp — lớp nào không vi phạm → count = 0
      const formatted = allClasses.map((cls: any, index: number) => {
        const className = cls.name || cls.className || `Lớp ${index + 1}`;
        const count = grouped[className] || 0;

        return {
          id: index + 1,
          className,
          count,
          total: count * multiplier,
        };
      });

      setSummaries(formatted);
    } catch (err) {
      console.error("❌ Lỗi load lineup:", err);
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
        {/* 🔹 Hiển thị tuần hiện tại */}
        {currentWeek && (
          <Typography variant="subtitle1">
            Tuần hiện tại: {currentWeek}
          </Typography>
        )}

        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
              {dayjs(w.endDate).format("DD/MM")})
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
