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
  IconButton,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Check, Delete } from "@mui/icons-material";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import api from "../../api/api";

dayjs.extend(weekOfYear);

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [session, setSession] = useState("sáng");
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "student">("day");
  const [statusFilter, setStatusFilter] = useState("Tất cả"); // ✅ bộ lọc trạng thái nghỉ
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // --- Load danh sách lớp
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

  // --- Gợi ý học sinh theo lớp
  useEffect(() => {
    if (!studentInput.trim() || (!className && viewMode !== "student")) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params:
            viewMode === "student"
              ? { name: studentInput.trim() }
              : { name: studentInput.trim(), className },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [studentInput, className, viewMode]);

  // --- Lấy danh sách nghỉ học
  const fetchRecords = async () => {
    if (!className && viewMode !== "student") return;
    try {
      const endpoint =
        viewMode === "week"
          ? `/api/class-attendance-summaries/by-week`
          : `/api/class-attendance-summaries/by-date`;

      const cleanDate = date.split(":")[0];

      const params =
        viewMode === "week"
          ? {
              className,
              weekNumber: dayjs(cleanDate).week(),
              grade: className.match(/^\d+/)?.[0] || "",
            }
          : viewMode === "student" && selectedStudent
          ? { studentId: selectedStudent._id }
          : { className, date: cleanDate };

      const res = await api.get(endpoint, { params });
      let data = res.data || [];

      // ✅ Lọc theo trạng thái nghỉ
      if (statusFilter !== "Tất cả") {
        data = data.filter((r: any) =>
          statusFilter === "Có phép" ? r.permission : !r.permission
        );
      }

      setRecords(data);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
      setRecords([]);
    }
  };

  useEffect(() => {
    if (viewMode === "student") {
      if (selectedStudent) fetchRecords();
    } else {
      fetchRecords();
    }
  }, [className, date, viewMode, selectedStudent, statusFilter]);

  // --- Ghi nhận nghỉ học
  const handleRecord = async () => {
    if (!selectedStudent || !className) {
      setSnackbar({ open: true, message: "Vui lòng chọn lớp và học sinh!", severity: "error" });
      return;
    }

    try {
      const payload = {
        studentId: selectedStudent._id,
        studentName: selectedStudent.name,
        className,
        grade,
        date,
        session,
      };

      await api.post(`/api/class-attendance-summaries/`, payload);

      setSnackbar({ open: true, message: "Đã ghi nhận nghỉ học.", severity: "success" });
      setSelectedStudent(null);
      setStudentInput("");
      fetchRecords();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi ghi nhận nghỉ học.",
        severity: "error",
      });
    }
  };

  // --- Duyệt phép
  const handleExcuse = async (id: string) => {
    try {
      await api.put(`/api/class-attendance-summaries/approve/${id}`);
      setSnackbar({ open: true, message: "Đã duyệt phép cho học sinh.", severity: "success" });
      fetchRecords();
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi khi duyệt phép.", severity: "error" });
    }
  };

  // --- Xóa ghi nhận
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa ghi nhận này không?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      setSnackbar({ open: true, message: "Đã xóa ghi nhận.", severity: "success" });
      fetchRecords();
    } catch (err) {
      setSnackbar({ open: true, message: "Lỗi khi xóa ghi nhận.", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận nghỉ học
      </Typography>

      {/* Khu vực nhập */}
      {viewMode !== "student" && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              select
              label="Lớp"
              size="small"
              value={className}
              onChange={(e) => {
                const value = e.target.value;
                setClassName(value);
                const g = value.match(/^\d+/)?.[0] || "";
                setGrade(g);
              }}
              sx={{ width: 150 }}
            >
              {classes.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              freeSolo
              options={suggestions}
              getOptionLabel={(s) => s.name || ""}
              inputValue={studentInput}
              onInputChange={(_, v) => setStudentInput(v)}
              onChange={(_, v) => setSelectedStudent(v)}
              sx={{ width: 220 }}
              renderInput={(params) => (
                <TextField {...params} label="Học sinh nghỉ học" size="small" />
              )}
            />

            <TextField
              label="Ngày"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <TextField
              select
              label="Buổi"
              size="small"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              sx={{ width: 120 }}
            >
              <MenuItem value="sáng">Sáng</MenuItem>
              <MenuItem value="chiều">Chiều</MenuItem>
            </TextField>

            <Button variant="contained" onClick={handleRecord}>
              Ghi nhận
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Bộ lọc trạng thái nghỉ */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Typography fontWeight="bold">Chế độ xem:</Typography>
        <ToggleButtonGroup
          size="small"
          color="primary"
          value={viewMode}
          exclusive
          onChange={(_e, v) => v && setViewMode(v)}
        >
          <ToggleButton value="day">Theo ngày</ToggleButton>
          <ToggleButton value="week">Theo tuần</ToggleButton>
          <ToggleButton value="student">Theo học sinh</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          select
          label="Trạng thái nghỉ"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 150 }}
        >
          <MenuItem value="Tất cả">Tất cả</MenuItem>
          <MenuItem value="Có phép">Có phép</MenuItem>
          <MenuItem value="Không phép">Không phép</MenuItem>
        </TextField>
      </Stack>

      {/* Danh sách */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Phép</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={r._id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.className}</TableCell>
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
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {!r.permission && (
                      <IconButton color="success" onClick={() => handleExcuse(r._id)}>
                        <Check />
                      </IconButton>
                    )}
                    <IconButton color="error" onClick={() => handleDelete(r._id)}>
                      <Delete />
                    </IconButton>
                  </Stack>
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
