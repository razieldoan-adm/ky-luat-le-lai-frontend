import { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import api from "../../api/api";

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

interface AttendanceRecord {
  _id: string;
  className: string;
  studentName: string;
  date: string;
  session: string;
  status: string; // "Không phép" | "Có phép"
}

export default function RecordAttendancePage() {
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [session, setSession] = useState("Sáng");

  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // --- Lấy danh sách lớp ---
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data.map((c: any) => c.className));
      } catch (err) {
        console.error("Lỗi tải lớp:", err);
      }
    })();
  }, []);

  // --- Lấy danh sách ghi nhận trong ngày ---
  const fetchRecords = async () => {
    if (!className || !selectedDate) return;
    try {
      const res = await api.get("/api/attendance", {
        params: { className, date: selectedDate },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [className, selectedDate]);

  // --- Gợi ý học sinh ---
  useEffect(() => {
    if (!studentInput.trim() || !className) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params: { name: studentInput.trim(), className },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [studentInput, className]);

  // --- Chọn học sinh ---
  const handleSelectSuggestion = (s: StudentSuggestion) => {
    if (!selectedStudents.includes(s.name)) setSelectedStudents((p) => [...p, s.name]);
    setStudentInput("");
    setSuggestions([]);
  };

  // --- Ghi nhận nghỉ học ---
  const handleRecord = async () => {
    if (!className || !selectedDate || selectedStudents.length === 0) {
      setAlert({ type: "error", msg: "Vui lòng chọn lớp, ngày và học sinh" });
      return;
    }

    try {
      await api.post("/api/attendance", {
        className,
        date: selectedDate,
        session,
        students: selectedStudents.map((name) => ({
          name,
          status: "Không phép",
        })),
      });
      setAlert({ type: "success", msg: "Đã ghi nhận nghỉ học" });
      setSelectedStudents([]);
      fetchRecords();
    } catch (err) {
      console.error(err);
      setAlert({ type: "error", msg: "Lỗi khi ghi nhận" });
    }
  };

  // --- Duyệt phép ---
  const handleApprove = async (id: string) => {
    try {
      await api.put(`/api/attendance/${id}/approve`);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Xóa ghi nhận ---
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/attendance/${id}`);
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận học sinh nghỉ học
      </Typography>

      {/* --- Bộ lọc chọn lớp, ngày, buổi --- */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Lớp"
          size="small"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          sx={{ minWidth: 120 }}
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
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          sx={{ minWidth: 180 }}
        />

        <TextField
          select
          label="Buổi"
          size="small"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Sáng">Sáng</MenuItem>
          <MenuItem value="Chiều">Chiều</MenuItem>
        </TextField>
      </Stack>

      {/* --- Nhập học sinh theo gợi ý --- */}
      <Box mb={2} sx={{ position: "relative" }}>
        <Typography fontWeight="bold" mb={1}>
          Học sinh nghỉ học
        </Typography>
        <TextField
          fullWidth
          placeholder="Nhập tên học sinh..."
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          size="small"
        />

        {/* Gợi ý học sinh */}
        {suggestions.length > 0 && (
          <Paper
            sx={{
              position: "absolute",
              zIndex: 10,
              width: "100%",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <Box
                key={s._id}
                sx={{
                  p: 1,
                  "&:hover": { bgcolor: "#f0f0f0", cursor: "pointer" },
                }}
                onClick={() => handleSelectSuggestion(s)}
              >
                {s.name} — {s.className}
              </Box>
            ))}
          </Paper>
        )}

        {/* Danh sách học sinh đã chọn */}
        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
          {selectedStudents.map((s) => (
            <Chip
              key={s}
              label={s}
              onDelete={() =>
                setSelectedStudents((prev) => prev.filter((n) => n !== s))
              }
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      </Box>

      {/* --- Nút ghi nhận --- */}
      <Button variant="contained" color="primary" onClick={handleRecord}>
        Ghi nhận nghỉ học
      </Button>

      {/* --- Danh sách ghi nhận --- */}
      <Typography mt={4} fontWeight="bold">
        Danh sách học sinh nghỉ học
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Ghi nhận</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r, i) => (
              <TableRow key={r._id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{r.date.split("T")[0]}</TableCell>
                <TableCell>
                  <Chip
                    label={r.status}
                    color={r.status === "Có phép" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {r.status !== "Có phép" && (
                    <IconButton
                      color="success"
                      onClick={() => handleApprove(r._id)}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton color="error" onClick={() => handleDelete(r._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Chưa có ghi nhận
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- Thông báo --- */}
      <Snackbar
        open={!!alert}
        autoHideDuration={2000}
        onClose={() => setAlert(null)}
      >
        {alert && (
          <Alert severity={alert.type} sx={{ width: "100%" }}>
            {alert.msg}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
