// src/pages/emulation/ClassAttendanceSummaryPage.tsx
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
import { getWeeksAndCurrentWeek } from "../../types/weekHelper";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface SummaryRow {
  id: number;
  className: string;
  absentCount: number;
  total: number;
}

export default function ClassAttendanceSummaryPage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(10);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  // 🔹 Load danh sách tuần
  useEffect(() => {
    const initWeeks = async () => {
      const { weeks: weekNumbers, currentWeek } = await getWeeksAndCurrentWeek();
      const formatted: AcademicWeek[] = weekNumbers.map((num) => ({
        _id: String(num),
        weekNumber: num,
      }));
      setWeeks(formatted);
      if (currentWeek) setSelectedWeek(String(currentWeek));
    };
    initWeeks();
  }, []);

  // 🔹 Hàm load dữ liệu chuyên cần
  const handleLoadData = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần!");

      const week = weeks.find((w) => w._id === selectedWeek);
      if (!week) return alert("Không tìm thấy tuần!");

      // 1️⃣ Lấy toàn bộ lớp
      const classRes = await api.get("/api/classes");
      const allClasses = classRes.data?.classes || classRes.data || [];

      // 2️⃣ Lấy danh sách nghỉ học trong tuần
      const res = await api.get("/api/class-attendance-summaries/weekly", {
        params: { weekNumber: week.weekNumber },
      });
      const records = res.data?.records || [];

      // 3️⃣ Gom nhóm số lần nghỉ học theo lớp
      const grouped: Record<string, number> = {};

      records.forEach(((r: any)) => {
        const cls = r.className?.trim();
        if (!cls) return;
      
        // ✅ Chỉ đếm khi vắng và không phép
        if (r.present === false && r.excuse === false) {
          grouped[cls] = (grouped[cls] || 0) + 1;
        }
      });

      // 4️⃣ Ghép toàn bộ lớp (lớp không có nghỉ = 0)
      const formatted = allClasses.map((cls: any, index: number) => {
        const className = cls.name || cls.className || `Lớp ${index + 1}`;
        const absentCount = grouped[className] || 0;

        return {
          id: index + 1,
          className,
          absentCount,
          total: absentCount * multiplier,
        };
      });

      setSummaries(formatted);
    } catch (err) {
      console.error("❌ Lỗi load dữ liệu chuyên cần:", err);
      alert("Không thể tải dữ liệu chuyên cần của tuần!");
    }
  };

  // 🔹 Lưu điểm vào ClassWeeklyScore
  const handleSave = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần trước khi lưu!");
      const week = weeks.find((w) => w._id === selectedWeek);
      if (!week) return alert("Không tìm thấy tuần!");

      for (const s of summaries) {
        await api.post("/api/class-attendance-summaries/update-weekly-score", {
          className: s.className,
          weekNumber: week.weekNumber,
          attendanceScore: s.total,
        });
      }

      alert("✅ Đã lưu điểm chuyên cần của tất cả lớp!");
    } catch (err) {
      console.error("Lỗi khi lưu điểm chuyên cần:", err);
      alert("❌ Lưu thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Tổng điểm chuyên cần các lớp theo tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          select
          label="Tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
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
              <TableCell>Số lần nghỉ</TableCell>
              <TableCell>Hệ số</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.absentCount}</TableCell>
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
