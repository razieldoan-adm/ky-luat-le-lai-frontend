import { useState, useEffect} from "react";
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
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";
import useAcademicWeeks from "../../types/useAcademicWeeks";

interface SummaryRow {
  id: number;
  className: string;
  absentCount: number;
  total: number;
}

export default function ClassAttendanceSummaryPage() {
  const { weeks, selectedWeek, setSelectedWeek,currentWeek } = useAcademicWeeks();
  const [multiplier, setMultiplier] = useState<number>(5); // ✅ hệ số mặc định = 5
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

useEffect(() => {
  if (currentWeek && weeks.length > 0) {
    setSelectedWeek(String(currentWeek));
  }
}, [currentWeek, weeks]);
  // 🔹 Hàm load dữ liệu chuyên cần
  const handleLoadData = async () => {
  try {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần!", severity: "error" });
      return;
    }

    const week = weeks.find((w) => String(w.weekNumber) === String(selectedWeek));
    if (!week) {
      setSnackbar({ open: true, message: "Không tìm thấy tuần!", severity: "error" });
      return;
    }

    // 2️⃣ Gọi API tổng hợp nghỉ học trong tuần (đã gom nhóm sẵn)
    const res = await api.get("/api/class-attendance-summaries/weekly-summary", {
      params: { weekNumber: week.weekNumber },
    });

    const results = res.data?.results || [];

    // 3️⃣ Tạo bảng tổng hợp: mỗi lớp = số lần nghỉ * hệ số
    const formatted = results.map((cls: any, index: number) => ({
      id: index + 1,
      className: cls.className,
      absentCount: cls.absences || 0,
      total: (cls.absences || 0) * multiplier,
    }));

    setSummaries(formatted);
    setSnackbar({ open: true, message: "✅ Đã tải dữ liệu chuyên cần.", severity: "success" });
  } catch (err) {
    console.error("❌ Lỗi load dữ liệu chuyên cần:", err);
    setSnackbar({ open: true, message: "Không thể tải dữ liệu chuyên cần của tuần!", severity: "error" });
  }
};

  // 🔹 Lưu điểm vào ClassWeeklyScore
const handleSave = async () => {
  try {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần trước khi lưu!", severity: "error" });
      return;
    }

    // ✅ Tìm tuần theo weekNumber
    const week = weeks.find((w) => String(w.weekNumber) === String(selectedWeek));
    if (!week) {
      setSnackbar({ open: true, message: "Không tìm thấy tuần!", severity: "error" });
      return;
    }

    // ✅ Log tạm để xem dữ liệu trước khi gửi (xóa sau khi test)
    console.log("📦 Dữ liệu sẽ gửi:", summaries, week.weekNumber);

    for (const s of summaries) {
      // ✅ Tách khối lớp (vd "7A1" -> "7")
      const gradeMatch = s.className.match(/^(\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : "Khác";

      // ✅ Gửi lên backend
      const payload = {
        className: s.className,
        grade,
        weekNumber: Number(week.weekNumber),
        attendanceScore: s.total,
      };

      console.log("➡️ POST /update payload:", payload);

      await api.post("/api/class-weekly-scores/update", payload);
    }

    setSnackbar({ open: true, message: "✅ Đã lưu điểm chuyên cần của tất cả lớp!", severity: "success" });
  } catch (err: any) {
    console.error("❌ Lỗi khi lưu điểm chuyên cần:", err.response?.data || err.message);
    setSnackbar({ open: true, message: "❌ Lưu thất bại! Kiểm tra console để xem chi tiết.", severity: "error" });
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
  label="Chọn tuần"
  value={selectedWeek}
  onChange={(e) => setSelectedWeek(e.target.value)}
  sx={{ minWidth: 220, mr: 2 }}
>
  {weeks.map((w) => (
    <MenuItem key={w._id} value={String(w.weekNumber)}>
      {`Tuần ${w.weekNumber}${
        w.weekNumber === currentWeek ? " (Tuần hiện tại)" : ""
      }`}
    </MenuItem>
  ))}
</TextField>

        <TextField
          label="Hệ số điểm"
          type="number"
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          sx={{ width: 120 }}
          helperText="Mặc định: 5"
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
              <TableCell>Số lần nghỉ (không phép)</TableCell>
              <TableCell>Hệ số</TableCell>
              <TableCell>Điểm trừ</TableCell>
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

      {/* Snackbar hiển thị thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
