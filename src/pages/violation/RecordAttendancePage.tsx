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
  IconButton,
  Tooltip,
} from "@mui/material";
import { CheckCircle, Delete } from "@mui/icons-material";
import dayjs from "dayjs";
import api from "../../api/api";

export default function RecordAttendancePage() {
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
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

  // 🔹 Lấy danh sách lớp
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

  // 🔹 Lấy danh sách học sinh theo lớp
  useEffect(() => {
    if (className) {
      api
        .get(`/students`, { params: { className } })
        .then((res) => setStudents(res.data))
        .catch(() => setStudents([]));
    }
  }, [className]);

  // 🔹 Lấy danh sách nghỉ học trong ngày
  const fetchRecords = async () => {
    if (!className) return;
    try {
      const res = await api.get(`/attendance/by-date`, {
        params: { className, date },
      });
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách nghỉ học:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [className, date]);

  // 🔹 Ghi nhận nghỉ học
  const handleRecord = async () => {
    if (!selectedStudent || !className) {
      setSnackbar({ open: true, message: "Vui lòng chọn lớp và học sinh!", severity: "error" });
      return;
    }

    try {
      await api.post("/attendance/record", {
        studentId: selectedStudent._id,
        studentName: selectedStudent.name,
        className,
        date,
        session,
      });

      setSnackbar({ open: true, message: "✅ Đã ghi nhận nghỉ học.", severity: "success" });
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

  // 🔹 Duyệt phép
  const handleApprove = async (id: string) => {
    try {
      await api.put(`/attendance/${id}/approve`);
      setSnackbar({ open: true, message: "✅ Đã duyệt phép cho học sinh.", severity: "success" });
      fetchRecords();
    } catch {
      setSnackbar({ open: true, message: "Lỗi khi duyệt phép!", severity: "error" });
    }
  };

  // 🔹 Xóa bản ghi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa bản ghi này?")) return;
    try {
      await api.delete(`/attendance/${id}`);
      setSnackbar({ open: true, message: "🗑️ Đã xóa bản ghi.", severity: "success" });
      fetchRecords();
    } catch {
      setSnackbar({ open: true, message: "Lỗi khi xóa bản ghi!", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận học sinh nghỉ học
      </Typography>

      {/* Bộ lọc và nhập nhanh */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Lớp"
            select
            size="small"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            sx={{ width: 150 }}
          >
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            disablePortal
            options={students}
            getOptionLabel={(s) => s.name || ""}
            value={selectedStudent}
            onChange={(_e, v) => setSelectedStudent(v)}
            sx={{ width: 250 }}
            renderInput={(params) => <TextField {...params} label="Học sinh" size="small" />}
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

          <TextField
            label="Ngày"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
          onChange={(_event, newValue) => {
            if (newValue) setViewMode(newValue);
          }}
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
              <TableCell>Lớp</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="center">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={r._id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{dayjs(r.date).format("DD/MM/YYYY")}</TableCell>
                <TableCell>
                  {r.permission ? (
                    <Typography color="green">Có phép</Typography>
                  ) : (
                    <Typography color="error">Không phép</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  {!r.permission && (
                    <Tooltip title="Duyệt phép">
                      <IconButton color="success" onClick={() => handleApprove(r._id)}>
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Xóa bản ghi">
                    <IconButton color="error" onClick={() => handleDelete(r._id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
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
