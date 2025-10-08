import { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "../../api/api";

interface ClassItem {
  _id: string;
  name: string;
}

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

interface ViolationRecord {
  _id: string;
  studentName: string;
  className: string;
  violationType: string;
  recorder: string;
  date: string;
}

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSuggestion | null>(null);
  const [violationType, setViolationType] = useState("");
  const [recorder, setRecorder] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const violationOptions = [
    "Tập trung xếp hàng quá thời gian quy định",
    "Mất trật tự, đùa giỡn khi xếp hàng",
    "Di chuyển lộn xộn không theo hàng lối",
  ];

  // 🔹 Load danh sách lớp
  useEffect(() => {
    api
      .get("/api/classes")
      .then((res) => setClasses(res.data))
      .catch((err) => console.error("Lỗi load classes:", err));
  }, []);

  // 🔹 Lấy danh sách lỗi theo lớp
  const fetchViolations = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get("/api/class-lineup-summaries", {
        params: { className: selectedClass },
      });
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi load violations:", err);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [selectedClass]);

  // 🔹 Gợi ý học sinh theo tên & lớp
  useEffect(() => {
    if (!studentName.trim() || !selectedClass) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get("/api/students/search", {
          params: { name: studentName.trim(), className: selectedClass },
        })
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [studentName, selectedClass]);

  // 🔹 Ghi nhận lỗi
  const handleSave = async () => {
    if (!selectedClass || !selectedStudent || !violationType || !recorder) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/class-lineup-summaries", {
        studentName: selectedStudent.name,
        className: selectedClass,
        violationType,
        recorder,
        date,
      });
      setSelectedStudent(null);
      setStudentName("");
      setViolationType("");
      fetchViolations();
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Xóa lỗi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa lỗi này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error("Lỗi xóa:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận lỗi xếp hàng
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          {/* Chọn lớp */}
          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            fullWidth
          >
            {classes.map((cls) => (
              <MenuItem key={cls._id} value={cls.name}>
                {cls.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Tên học sinh */}
          <Box position="relative">
            <TextField
              label="Tên học sinh"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              fullWidth
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <Paper
                sx={{
                  position: "absolute",
                  zIndex: 10,
                  width: "100%",
                  mt: 1,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {suggestions.map((s) => (
                  <Box
                    key={s._id}
                    sx={{
                      p: 1,
                      "&:hover": { bgcolor: "#eee", cursor: "pointer" },
                    }}
                    onClick={() => {
                      setSelectedStudent(s);
                      setStudentName(s.name);
                      setSuggestions([]);
                    }}
                  >
                    {s.name} ({s.className})
                  </Box>
                ))}
              </Paper>
            )}
          </Box>

          {/* Lỗi vi phạm */}
          <TextField
            select
            label="Lỗi vi phạm"
            value={violationType}
            onChange={(e) => setViolationType(e.target.value)}
            fullWidth
          >
            {violationOptions.map((opt, i) => (
              <MenuItem key={i} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>

          {/* Người ghi nhận */}
          <TextField
            label="Người ghi nhận"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            fullWidth
          />

          {/* Ngày giờ */}
          <TextField
            label="Thời gian"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Ghi nhận"}
          </Button>
        </Stack>
      </Paper>

      {/* Danh sách lỗi */}
      <Typography variant="h6" gutterBottom>
        Danh sách vi phạm
      </Typography>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Học sinh</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Người ghi nhận</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="center">Xóa</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              violations.map((v) => (
                <TableRow key={v._id}>
                  <TableCell>{v.studentName}</TableCell>
                  <TableCell>{v.violationType}</TableCell>
                  <TableCell>{v.recorder}</TableCell>
                  <TableCell>
                    {new Date(v.date).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(v._id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
