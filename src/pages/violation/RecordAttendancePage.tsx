import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, MenuItem, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, Stack,
  IconButton, Chip, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "../../api/api";

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

interface AttendanceRecord {
  _id: string;
  studentName: string;
  date: string;
  session: string;
  permission: boolean;
  recordedBy: string;
}

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSuggestion | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("Sáng");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<"ngày" | "tuần">("ngày");

  // ✅ Người ghi nhận mặc định
  const recorder = "PGT";

  // ✅ Xác định buổi học tự động
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

  // ✅ Gợi ý học sinh theo tên + lớp
  useEffect(() => {
    if (!studentInput.trim() || !selectedClass) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params: { name: studentInput.trim(), className: selectedClass },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentInput, selectedClass]);

  // ✅ Tải danh sách nghỉ học
  const loadRecords = async () => {
    if (!selectedClass || !date) return;
    try {
      let res;
      if (viewMode === "ngày") {
        res = await api.get(`/attendance/list?className=${selectedClass}&date=${date}`);
      } else {
        const d = new Date(date);
        const day = d.getDay() || 7;
        const start = new Date(d);
        start.setDate(d.getDate() - (day - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        res = await api.get(`/attendance/list/week`, {
          params: {
            className: selectedClass,
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
          },
        });
      }
      setRecords(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách nghỉ:", err);
    }
  };

  // ✅ Ghi nhận nghỉ học
  const handleAdd = async () => {
    if (!selectedStudent || !selectedClass) {
      alert("Chưa chọn lớp hoặc học sinh!");
      return;
    }
    try {
      await api.post("/attendance/record", {
        className: selectedClass,
        studentName: selectedStudent.name,
        date,
        session,
        recordedBy: recorder,
        permission: false, // chưa được GVCN xác nhận
      });
      alert("✅ Đã ghi nhận nghỉ học không phép");
      setStudentInput("");
      setSelectedStudent(null);
      setSuggestions([]);
      loadRecords();
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
    }
  };

  // ✅ Xóa bản ghi nghỉ học
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa bản ghi này?")) return;
    await api.delete(`/attendance/${id}`);
    loadRecords();
  };

  // ✅ Chọn học sinh từ gợi ý
  const handleSelectSuggestion = (s: StudentSuggestion) => {
    setSelectedStudent(s);
    setStudentInput(s.name);
    setSuggestions([]);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận chuyên cần
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
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
          label="Ngày"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          select label="Buổi"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Sáng">Sáng</MenuItem>
          <MenuItem value="Chiều">Chiều</MenuItem>
        </TextField>

        <RadioGroup
          row
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as "ngày" | "tuần")}
        >
          <FormControlLabel value="ngày" control={<Radio />} label="Theo ngày" />
          <FormControlLabel value="tuần" control={<Radio />} label="Theo tuần" />
        </RadioGroup>

        <Button variant="outlined" onClick={loadRecords}>
          Xem danh sách
        </Button>
      </Stack>

      {/* Nhập tên học sinh và gợi ý */}
      {selectedClass && (
        <Stack direction="row" spacing={2} mb={2}>
          <Box sx={{ position: "relative", width: 250 }}>
            <TextField
              label="Tên học sinh"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              fullWidth
            />
            {suggestions.length > 0 && (
              <Paper
                sx={{
                  position: "absolute", zIndex: 10, width: "100%",
                  maxHeight: 200, overflowY: "auto"
                }}
              >
                {suggestions.map((s) => (
                  <Box
                    key={s._id}
                    sx={{
                      p: 1,
                      "&:hover": { backgroundColor: "#f0f0f0", cursor: "pointer" },
                    }}
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s.name}
                  </Box>
                ))}
              </Paper>
            )}
          </Box>

          <Button variant="contained" onClick={handleAdd}>
            Thêm nghỉ học
          </Button>
        </Stack>
      )}

      {/* Danh sách nghỉ học */}
      <Paper sx={{ mt: 2 }}>
        <Typography variant="h6" p={2}>
          Danh sách học sinh nghỉ ({viewMode === "ngày" ? date : "theo tuần"})
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Phép</TableCell>
              <TableCell>Người ghi nhận</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có học sinh nghỉ
                </TableCell>
              </TableRow>
            )}
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{new Date(r.date).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  {r.permission ? (
                    <Chip label="Có phép" color="success" size="small" />
                  ) : (
                    <Chip label="Không phép" color="error" size="small" />
                  )}
                </TableCell>
                <TableCell>{r.recordedBy}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => handleDelete(r._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
