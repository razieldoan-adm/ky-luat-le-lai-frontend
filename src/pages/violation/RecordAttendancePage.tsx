// src/pages/violation/RecordAttendancePage.tsx
import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, MenuItem, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, Stack,
  Autocomplete, IconButton, Chip, Snackbar, Alert
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "../../api/api";
import type { AlertColor } from "@mui/material";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("Sáng");
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"Ngày" | "Tuần">("Ngày");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false, message: "", severity: "info"
  });

  // ✅ Tự xác định buổi học
  useEffect(() => {
    const hour = new Date().getHours();
    setSession(hour >= 12 ? "Chiều" : "Sáng");
  }, []);

  // ✅ Lấy danh sách lớp
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

  // ✅ Gợi ý học sinh theo lớp + tên
  useEffect(() => {
    if (!studentInput.trim() || !selectedClass) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/classes/students/" + selectedClass);
        const filtered = (res.data || []).filter((s: any) =>
          s.name.toLowerCase().includes(studentInput.trim().toLowerCase())
        );
        setSuggestions(filtered);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentInput, selectedClass]);

  // ✅ Tải danh sách nghỉ học
  const loadRecords = async () => {
    if (!selectedClass) return;
    try {
      let url = `/api/class-attendance-summaries/list?className=${selectedClass}`;
      if (viewMode === "Ngày") {
        url += `&date=${date}`;
      }
      const res = await api.get(url);
      setRecords(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách nghỉ:", err);
      setSnackbar({ open: true, message: "Không tải được dữ liệu", severity: "error" });
    }
  };

  // ✅ Ghi nhận nghỉ học
  const handleAdd = async () => {
    if (!selectedStudent || !selectedClass)
      return alert("Chưa chọn lớp hoặc học sinh");

    try {
      await api.post("/api/class-attendance-summaries/record", {
        className: selectedClass,
        studentName: selectedStudent.name,
        date,
        session,
        recordedBy: "PGT",
      });
      setSnackbar({ open: true, message: "✅ Đã ghi nhận nghỉ học", severity: "success" });
      setSelectedStudent(null);
      loadRecords();
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
      setSnackbar({ open: true, message: "❌ Ghi nhận thất bại", severity: "error" });
    }
  };

  // ✅ Xóa bản ghi nghỉ học
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa bản ghi này?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      loadRecords();
    } catch (err) {
      console.error("Lỗi xóa:", err);
      setSnackbar({ open: true, message: "Lỗi khi xóa bản ghi", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận nghỉ học
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select label="Lớp"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {classes.map(cls => (
            <MenuItem key={cls} value={cls}>{cls}</MenuItem>
          ))}
        </TextField>

        <TextField
          select label="Xem theo"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as "Ngày" | "Tuần")}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Ngày">Ngày</MenuItem>
          <MenuItem value="Tuần">Tuần</MenuItem>
        </TextField>

        <TextField
          label="Ngày"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Button variant="outlined" onClick={loadRecords}>
          Xem danh sách
        </Button>
      </Stack>

      {/* Thêm học sinh nghỉ */}
      {selectedClass && (
        <Stack direction="row" spacing={2} mb={2}>
          <Autocomplete
            options={suggestions}
            getOptionLabel={(option) => option.name}
            value={selectedStudent}
            onInputChange={(_, val) => setStudentInput(val)}
            onChange={(_, val) => setSelectedStudent(val)}
            sx={{ width: 250 }}
            renderInput={(params) => (
              <TextField {...params} label="Tên học sinh" />
            )}
          />
          <Button variant="contained" onClick={handleAdd}>
            Thêm nghỉ học
          </Button>
        </Stack>
      )}

      {/* Danh sách */}
      <Paper sx={{ mt: 2 }}>
        <Typography variant="h6" p={2}>
          Danh sách học sinh nghỉ {viewMode === "Ngày" ? `ngày ${date}` : "theo tuần"}
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Phép</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.studentId?.name || r.studentName}</TableCell>
                  <TableCell>{r.session}</TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>
                    {r.isExcused ? (
                      <Chip label="Có phép" color="success" size="small" />
                    ) : (
                      <Chip label="Không phép" color="error" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton color="error" onClick={() => handleDelete(r._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
