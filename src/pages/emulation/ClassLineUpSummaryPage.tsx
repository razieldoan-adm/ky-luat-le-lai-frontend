import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  MenuItem,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  className: string;
}

interface StudentOption {
  _id: string;
  name: string;
  className: string;
}

interface ViolationRecord {
  _id: string;
  className: string;
  studentName: string;
  violation: string;
  recordedBy: string;
  createdAt: string;
}

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [violation, setViolation] = useState("");
  const [recordedBy, setRecordedBy] = useState("Th Huy");
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // 🔹 Khi chọn lớp thì load danh sách học sinh
  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      try {
        const res = await api.get("/api/students", {
          params: { className: selectedClass },
        });
        setStudents(res.data);
      } catch (err) {
        console.error("Lỗi khi tải học sinh:", err);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // 🔹 Load danh sách vi phạm gần đây
  const loadRecords = async () => {
    try {
      const res = await api.get("/api/class-lineup-summaries");
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // 🔹 Lưu vi phạm
  const handleSave = async () => {
    if (!selectedStudent || !violation) return alert("Vui lòng nhập đầy đủ thông tin!");
    setLoading(true);
    try {
      await api.post("/api/class-lineup-summaries", {
        className: selectedClass,
        studentName: selectedStudent,
        violation,
        recordedBy,
        createdAt: new Date().toISOString(), // tự lấy giờ hệ thống
      });
      setViolation("");
      setSelectedStudent("");
      await loadRecords();
    } catch (err) {
      console.error("Lỗi khi lưu vi phạm:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Xóa vi phạm
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa vi phạm này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận vi phạm xếp hàng
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>Chọn lớp</em>
            </MenuItem>
            {classes.map((c) => (
              <MenuItem key={c._id} value={c.className}>
                {c.className}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>Học sinh vi phạm</em>
            </MenuItem>
            {students.map((s) => (
              <MenuItem key={s._id} value={s.name}>
                {s.name}
              </MenuItem>
            ))}
          </Select>

          <TextField
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
            fullWidth
          />

          <TextField
            label="Người ghi nhận"
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
            fullWidth
          />

          <TextField
            label="Ngày ghi nhận"
            value={new Date().toLocaleDateString("vi-VN")}
            disabled
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? "Đang lưu..." : "LƯU"}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h6" fontWeight="bold" mb={1}>
        Danh sách vi phạm gần đây
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Thời gian</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Người ghi nhận</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>
                  {new Date(r.createdAt).toLocaleString("vi-VN")}
                </TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.violation}</TableCell>
                <TableCell>{r.recordedBy}</TableCell>
                <TableCell>
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => handleDelete(r._id)}
                  >
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
