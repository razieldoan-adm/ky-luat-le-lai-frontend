// src/pages/attendance/RecordAttendancePage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Snackbar,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from "@mui/material";
import dayjs from "dayjs";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
}

interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  session: string;
  permission: boolean;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function RecordAttendancePage() {
  const [viewMode, setViewMode] = useState<"day" | "week" | "student">("day");
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: any }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Học sinh
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 📘 Load danh sách lớp
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  // 🔍 Gợi ý học sinh khi nhập
  useEffect(() => {
    if (!studentInput.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          name: studentInput.trim(),
          normalizedName: removeVietnameseTones(studentInput.trim()),
        });
        const res = await api.get(`/api/students/search?${params.toString()}`);
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [studentInput]);

  // 📦 Lấy danh sách nghỉ học theo chế độ xem
  const fetchRecords = async () => {
    try {
      let res;
      const cleanDate = date.split(":")[0];

      if (viewMode === "day") {
        res = await api.get(`/api/class-attendance-summaries/by-date`, {
          params: { className, date: cleanDate },
        });
      } else if (viewMode === "week") {
        res = await api.get(`/api/class-attendance-summaries/by-week`, {
          params: { className, date: cleanDate },
        });
      } else if (viewMode === "student" && selectedStudent) {
        res = await api.get(`/api/class-attendance-summaries/by-student/${selectedStudent._id}`);
      } else {
        setRecords([]);
        return;
      }

      setRecords(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
      setRecords([]);
    }
  };

  // 🔁 Tự động fetch khi thay đổi điều kiện
  useEffect(() => {
    fetchRecords();
  }, [viewMode, className, date, selectedStudent]);

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận chuyên cần
      </Typography>

      {/* Bộ chọn chế độ xem */}
      <Stack direction="row" spacing={2} mb={2}>
        <Typography fontWeight="bold">Xem danh sách theo:</Typography>
        <ToggleButtonGroup
          color="primary"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
        >
          <ToggleButton value="day">Ngày</ToggleButton>
          <ToggleButton value="week">Tuần</ToggleButton>
          <ToggleButton value="student">Học sinh</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Bộ lọc dữ liệu */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {viewMode === "student" ? (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Autocomplete
              freeSolo
              options={suggestions}
              getOptionLabel={(s) => s.name || ""}
              inputValue={studentInput}
              onInputChange={(_, v) => setStudentInput(v)}
              onChange={(_, v) => setSelectedStudent(v)}
              sx={{ width: 250 }}
              renderInput={(params) => (
                <TextField {...params} label="Nhập tên học sinh" size="small" />
              )}
            />
            {selectedStudent && (
              <Typography variant="body2" color="gray">
                Lớp: {selectedStudent.className}
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              select
              label="Lớp"
              size="small"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              sx={{ width: 160 }}
            >
              {classes.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
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
          </Stack>
        )}
      </Paper>

      {/* Bảng dữ liệu */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Phép</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              records.map((r, i) => (
                <TableRow key={r._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.className}</TableCell>
                  <TableCell>{dayjs(r.date).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{r.session}</TableCell>
                  <TableCell>
                    {r.permission ? (
                      <Typography color="green">Có phép</Typography>
                    ) : (
                      <Typography color="error">Không phép</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Thông báo */}
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
