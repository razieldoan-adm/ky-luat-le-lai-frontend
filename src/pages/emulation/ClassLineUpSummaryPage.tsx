
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  className: string;
  grade: string;
}

interface StudentSuggestion {
  _id: string;
  name: string;
}

interface ViolationRecord {
  _id: string;
  className: string;
  violation: string;
  studentName: string;
  recorder: string;
  note?: string;
  date: string;
}

interface WeeklyScore {
  _id: string;
  className: string;
  lineUpScore: number;
  totalScore: number;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function ClassLineupSummaryPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>([]);
  const [selectedViolation, setSelectedViolation] = useState("");
  const [studentName, setStudentName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    StudentSuggestion[]
  >([]);
  const [recorder, setRecorder] = useState("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  // Lấy danh sách lớp
  useEffect(() => {
    api
      .get("/api/classes")
      .then((res) => setClasses(res.data))
      .catch((err) => console.error("Fetch classes error:", err));
  }, []);

  // Lấy danh sách học sinh theo lớp
  useEffect(() => {
    if (!selectedClassId) {
      setSuggestions([]);
      return;
    }
    api
      .get(`/api/students/by-class/${selectedClassId}`)
      .then((res) => setSuggestions(res.data))
      .catch((err) => console.error("Fetch students error:", err));
  }, [selectedClassId]);

  // Lọc học sinh theo tên
  useEffect(() => {
    if (!studentName.trim()) {
      setFilteredSuggestions([]);
      return;
    }
    const lower = removeVietnameseTones(studentName.toLowerCase());
    const filtered = suggestions.filter((s) =>
      removeVietnameseTones(s.name.toLowerCase()).includes(lower)
    );
    setFilteredSuggestions(filtered);
  }, [studentName, suggestions]);

  // Lấy danh sách vi phạm trong ngày
  const fetchViolations = () => {
    api
      .get(`/api/class-lineup-summaries?date=${date}`)
      .then((res) => setViolations(res.data))
      .catch((err) => console.error("Fetch violations error:", err));
  };

  useEffect(() => {
    fetchViolations();
  }, [date]);

  // Lấy tổng điểm tuần
  useEffect(() => {
    api
      .get("/api/class-lineup-summaries/weekly-summary")
      .then((res) => setWeeklyScores(res.data))
      .catch((err) => console.error("Fetch weekly scores error:", err));
  }, []);

  const handleSave = async () => {
    if (!selectedClassId || !selectedViolation || !studentName || !recorder)
      return alert("Vui lòng nhập đầy đủ thông tin");

    try {
      await api.post("/api/class-lineup-summaries", {
        className:
          classes.find((c) => c._id === selectedClassId)?.className || "",
        violation: selectedViolation,
        studentName,
        recorder,
        date,
      });
      setStudentName("");
      fetchViolations();
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi ghi nhận");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa ghi nhận này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      fetchViolations();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận vi phạm xếp hàng
      </Typography>

      {/* Form ghi nhận */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <Select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="">Chọn lớp</MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls._id} value={cls._id}>
                {cls.className}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={selectedViolation}
            onChange={(e) => setSelectedViolation(e.target.value)}
            displayEmpty
            fullWidth
          >
            <MenuItem value="">Chọn lỗi vi phạm</MenuItem>
            <MenuItem value="Không xếp hàng">Không xếp hàng</MenuItem>
            <MenuItem value="Nói chuyện">Nói chuyện</MenuItem>
            <MenuItem value="Mất trật tự">Mất trật tự</MenuItem>
          </Select>

          <TextField
            label="Người ghi nhận"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            fullWidth
          />

          <TextField
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
          />
        </Stack>

        <Box sx={{ mt: 2, position: "relative" }}>
          <TextField
            label="Tên học sinh vi phạm"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            fullWidth
            autoComplete="off"
          />
          {studentName && filteredSuggestions.length > 0 && (
            <Paper
              sx={{
                position: "absolute",
                zIndex: 10,
                width: "100%",
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {filteredSuggestions.map((s) => (
                <MenuItem key={s._id} onClick={() => setStudentName(s.name)}>
                  {s.name}
                </MenuItem>
              ))}
            </Paper>
          )}
        </Box>

        <Box textAlign="right" mt={2}>
          <Button variant="contained" onClick={handleSave}>
            Ghi nhận
          </Button>
        </Box>
      </Paper>

      {/* Danh sách vi phạm */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography fontWeight="bold" mb={2}>
          Danh sách vi phạm ({new Date(date).toLocaleDateString("vi-VN")})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ngày</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Lỗi vi phạm</TableCell>
                <TableCell>Tên học sinh</TableCell>
                <TableCell>Người ghi nhận</TableCell>
                <TableCell>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {violations.length > 0 ? (
                violations.map((v) => (
                  <TableRow key={v._id}>
                    <TableCell>
                      {new Date(v.date).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>{v.className}</TableCell>
                    <TableCell>{v.violation}</TableCell>
                    <TableCell>{v.studentName}</TableCell>
                    <TableCell>{v.recorder}</TableCell>
                    <TableCell>
                      <Button
                        color="error"
                        onClick={() => handleDelete(v._id)}
                        size="small"
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Tổng điểm tuần */}
      <Paper sx={{ p: 2 }}>
        <Typography fontWeight="bold" mb={2}>
          Tổng điểm xếp hàng trong tuần
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Điểm xếp hàng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weeklyScores.length > 0 ? (
                weeklyScores.map((w) => (
                  <TableRow key={w._id}>
                    <TableCell>{w.className}</TableCell>
                    <TableCell>{w.totalScore}</TableCell>
                    <TableCell>{w.lineUpScore}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Chưa có dữ liệu tuần này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

