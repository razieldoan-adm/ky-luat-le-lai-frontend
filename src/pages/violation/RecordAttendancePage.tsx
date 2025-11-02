
// src/pages/violation/RecordAttendancePage.tsx
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
import api from "../../api/api";

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // 🔹 Dữ liệu nhập ghi nhận
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [session, setSession] = useState("sáng");

  // 🔹 Dữ liệu xem danh sách
  const [records, setRecords] = useState<any[]>([]);

  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [selectedClassView, setSelectedClassView] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: any }>({
    open: false,
    message: "",
    severity: "success",
  });

  // --- Load danh sách lớp (chỉ phục vụ ghi nhận)
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("❌ Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  // --- Gợi ý học sinh theo lớp
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
        console.error("❌ Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentInput, className]);

  // --- Lấy danh sách nghỉ học (toàn bộ, không theo lớp)
  const fetchRecords = async () => {
    try {
      const endpoint = `/api/class-attendance-summaries/by-week`;
      const params: any = { week: viewWeek };

      const res = await api.get(endpoint, { params });
      const data = res.data.records || res.data || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Lỗi tải danh sách:", err);
      setRecords([]);
    }
  };

  // --- Gọi lại khi bộ lọc thay đổi
useEffect(() => {
  if (viewWeek) fetchRecords();
}, [viewWeek]);

  // --- Ghi nhận nghỉ học
  const handleRecord = async () => {
    if (!selectedStudent || !className) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn lớp và học sinh!",
        severity: "error",
      });
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
      setSnackbar({
        open: true,
        message: "✅ Đã ghi nhận nghỉ học.",
        severity: "success",
      });

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
      setSnackbar({
        open: true,
        message: "✅ Đã duyệt phép cho học sinh.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi duyệt phép:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi duyệt phép.",
        severity: "error",
      });
    }
  };

  // --- Xóa ghi nhận
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa ghi nhận này không?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      setSnackbar({
        open: true,
        message: "✅ Đã xóa ghi nhận.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi xóa:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi xóa ghi nhận.",
        severity: "error",
      });
    }
  };

  // --- Gom nhóm bản ghi theo lớp
  const groupedByClass = records.reduce((acc: any, rec: any) => {
    if (!acc[rec.className]) acc[rec.className] = [];
    acc[rec.className].push(rec);
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận chuyên cần
      </Typography>

      {/* --- Nhập dữ liệu ghi nhận --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Chọn lớp */}
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
            sx={{ width: 160 }}
          >
            {classes.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>

          {/* Học sinh */}
          <Autocomplete
            freeSolo
            options={suggestions}
            getOptionLabel={(s) => s.name || ""}
            inputValue={studentInput}
            onInputChange={(_, v) => setStudentInput(v)}
            onChange={(_, v) => setSelectedStudent(v)}
            sx={{ width: 250 }}
            renderInput={(params) => (
              <TextField {...params} label="Học sinh nghỉ học" size="small" />
            )}
          />

          {/* Ngày */}
          <TextField
            label="Ngày"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {/* Buổi */}
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

          <Button variant="contained" color="primary" onClick={handleRecord}>
            Ghi nhận
          </Button>
        </Stack>
      </Paper>

      {/* --- Chế độ xem --- */}
      <Stack direction="column" spacing={2} mb={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography fontWeight="bold">Xem danh sách:</Typography>
                <ToggleButtonGroup
                  size="small"
                  color="primary"
                  value={viewMode}
                  exclusive
                  onChange={(_e, v) => v && setViewMode(v)}
                >
                  <ToggleButton value="week">Theo tuần</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
        {viewMode === "week" && (
          <TextField
            label="Chọn tuần"
            select
            size="small"
            value={viewWeek || ""}
            onChange={(e) => setViewWeek(Number(e.target.value))}
            sx={{ width: 200 }}
          >
            {[...Array(20)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                Tuần {i + 1}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      {/* --- Hiển thị danh sách nghỉ học theo lớp --- */}
      {Object.keys(groupedByClass).length === 0 ? (
        <Typography color="gray" mt={2}>
          Không có học sinh nghỉ học trong thời gian này.
        </Typography>
      ) : (
        <Box>
          <Typography fontWeight="bold" mb={1}>
            Các lớp có học sinh nghỉ học:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
            {Object.keys(groupedByClass).map((cls) => (
              <Button
                key={cls}
                variant={selectedClassView === cls ? "contained" : "outlined"}
                onClick={() => setSelectedClassView(cls)}
              >
                {cls} ({groupedByClass[cls].length})
              </Button>
            ))}
          </Stack>

          {selectedClassView && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Danh sách nghỉ học - {selectedClassView}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>STT</TableCell>
                      <TableCell>Họ tên</TableCell>
                      <TableCell>Buổi</TableCell>
                      <TableCell>Ngày</TableCell>
                      <TableCell>Phép</TableCell>
                      <TableCell>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedByClass[selectedClassView].map((r: any, i: number) => (
                      <TableRow key={r._id || i}>
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
            </Paper>
          )}
        </Box>
      )}

      {/* --- Thông báo --- */}
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
