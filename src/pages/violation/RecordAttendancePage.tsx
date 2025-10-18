import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  MenuItem,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import api from "../../api/api"; // ✅ Dùng instance axios của bạn

export default function RecordAttendancePage() {
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [session, setSession] = useState("sáng");
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: any }>({
    open: false,
    message: "",
    severity: "success",
  });

  // 🔹 Lấy danh sách học sinh trong lớp
  useEffect(() => {
    if (grade && className) {
      api
        .get(`/students`, { params: { grade, className } })
        .then((res) => setStudents(res.data))
        .catch(() => setStudents([]));
    }
  }, [grade, className]);

  // 🔹 Lấy danh sách nghỉ học trong ngày
  const fetchRecords = async () => {
    if (!className || !grade) return;
    try {
      const res = await api.get(`/attendance/by-date`, {
        params: { className, grade, date },
      });
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách nghỉ học:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [className, grade, date]);

  // 🔹 Ghi nhận nghỉ học
  const handleRecord = async () => {
    if (!selectedStudent || !className || !grade) {
      setSnackbar({ open: true, message: "Vui lòng chọn đủ thông tin!", severity: "error" });
      return;
    }

    try {
      await api.post("/attendance/record", {
        studentId: selectedStudent._id,
        studentName: selectedStudent.name,
        className,
        grade,
        date,
        session,
      });

      setSnackbar({ open: true, message: "Đã ghi nhận nghỉ học.", severity: "success" });
      setSelectedStudent(null);
      fetchRecords();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi ghi nhận nghỉ học.",
        severity: "error",
      });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận học sinh nghỉ học
      </Typography>

      {/* Bộ lọc */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Khối"
            select
            size="small"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            sx={{ width: 120 }}
          >
            {[10, 11, 12].map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Lớp"
            select
            size="small"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            sx={{ width: 150 }}
          >
            {[...Array(5)].map((_, i) => (
              <MenuItem key={i + 1} value={`${grade}A${i + 1}`}>
                {grade}A{i + 1}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Ngày"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <TextField
            label="Buổi"
            select
            size="small"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            sx={{ width: 120 }}
          >
            <MenuItem value="sáng">Sáng</MenuItem>
            <MenuItem value="chiều">Chiều</MenuItem>
          </TextField>

          <Autocomplete
            disablePortal
            options={students}
            getOptionLabel={(s) => s.name || ""}
            value={selectedStudent}
            onChange={(v) => setSelectedStudent(v)}
            sx={{ width: 250 }}
            renderInput={(params) => <TextField {...params} label="Học sinh nghỉ học" size="small" />}
          />

          <Button variant="contained" color="primary" onClick={handleRecord}>
            Ghi nhận
          </Button>
        </Stack>
      </Paper>

      {/* Chuyển chế độ xem */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Typography fontWeight="bold">Xem danh sách:</Typography>
        <ToggleButtonGroup
          size="small"
          color="primary"
          value={viewMode}
          exclusive
          onChange={(v) => v && setViewMode(v)}
        >
          <ToggleButton value="day">Theo ngày</ToggleButton>
          <ToggleButton value="week">Theo tuần</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Bảng danh sách nghỉ học */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Phép</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={r._id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>
                  {r.permission ? (
                    <Typography color="green">Có phép</Typography>
                  ) : (
                    <Typography color="error">Không phép</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
