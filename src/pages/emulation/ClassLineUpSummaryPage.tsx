import { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
}

interface Violation {
  _id: string;
  className: string;
  student?: string;
  violationType: string;
  reporter: string;
  date: string;
}

export default function ClassViolationPage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [violationType, setViolationType] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reporter, setReporter] = useState("Thầy Huy");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [violations, setViolations] = useState<Violation[]>([]);

  // Load danh sách lớp
  useEffect(() => {
    api
      .get("/api/classes")
      .then((res) => {
        if (Array.isArray(res.data)) {
          const list = res.data.map((c: any) => c.className || c.name);
          setClasses(list);
        }
      })
      .catch((err) => console.error("Lỗi tải lớp:", err));
  }, []);

  // Khi chọn lớp → load danh sách học sinh
  useEffect(() => {
    if (!selectedClass) return;
    api
      .get("/api/students", { params: { className: selectedClass } })
      .then((res) => setStudents(res.data))
      .catch((err) => console.error("Lỗi tải học sinh:", err));
  }, [selectedClass]);

  // Gợi ý học sinh theo tên trong lớp
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      const filtered = students.filter((s) =>
        s.name.toLowerCase().includes(name.toLowerCase())
      );
      setSuggestions(filtered);
    }, 300);
    return () => clearTimeout(timeout);
  }, [name, students]);

  // Ghi nhận lỗi
  const handleRecord = async () => {
    if (!selectedClass || !violationType || !reporter) {
      alert("Vui lòng nhập đủ thông tin cần thiết!");
      return;
    }

    const payload = {
      className: selectedClass,
      student: selectedStudent ? selectedStudent.name : "",
      violationType,
      reporter,
      date,
    };

    try {
      const res = await api.post("/api/class-lineup-summary", payload);
      setViolations((prev) => [...prev, res.data]);
      setViolationType("");
      setSelectedStudent(null);
      setName("");
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
      alert("Không thể ghi nhận vi phạm!");
    }
  };

  // Xóa lỗi
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/class-lineup-summary/${id}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error("Lỗi xoá:", err);
      alert("Không thể xoá vi phạm!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận lỗi vi phạm lớp
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Lớp */}
          <Box>
            <Typography fontWeight={500}>Chọn lớp</Typography>
            <Select
              fullWidth
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map((cls) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Học sinh vi phạm */}
          <Box>
            <Typography fontWeight={500}>Học sinh vi phạm (nếu có)</Typography>
            <TextField
              fullWidth
              placeholder="Nhập tên học sinh..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {suggestions.length > 0 && (
              <Paper sx={{ mt: 1, p: 1, maxHeight: 150, overflowY: "auto" }}>
                {suggestions.map((s) => (
                  <Box
                    key={s._id}
                    sx={{
                      p: 1,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "#f0f0f0" },
                    }}
                    onClick={() => {
                      setSelectedStudent(s);
                      setSuggestions([]);
                      setName(s.name);
                    }}
                  >
                    {s.name}
                  </Box>
                ))}
              </Paper>
            )}
            {selectedStudent && (
              <Typography mt={1} color="green">
                ✅ {selectedStudent.name}
              </Typography>
            )}
          </Box>

          {/* Lỗi */}
          <Box>
            <Typography fontWeight={500}>Nội dung lỗi</Typography>
            <TextField
              fullWidth
              placeholder="Nhập lỗi vi phạm..."
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
            />
          </Box>

          {/* Người ghi nhận */}
          <Box>
            <Typography fontWeight={500}>Người ghi nhận</Typography>
            <Select
              fullWidth
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
            >
              <MenuItem value="Thầy Huy">Thầy Huy</MenuItem>
              <MenuItem value="Thầy Năm">Thầy Năm</MenuItem>
              <MenuItem value="Thầy Nghĩa">Thầy Nghĩa</MenuItem>
            </Select>
          </Box>

          {/* Thời gian */}
          <Box>
            <Typography fontWeight={500}>Thời gian ghi nhận</Typography>
            <TextField
              fullWidth
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Box>

          {/* Nút ghi nhận */}
          <Button variant="contained" color="primary" onClick={handleRecord}>
            Ghi nhận vi phạm
          </Button>
        </Stack>
      </Paper>

      {/* Danh sách lỗi */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={1}>
          Danh sách vi phạm đã ghi nhận
        </Typography>
        {violations.length === 0 ? (
          <Typography>Chưa có lỗi nào được ghi nhận.</Typography>
        ) : (
          <List>
            {violations.map((v) => (
              <ListItem
                key={v._id}
                secondaryAction={
                  <IconButton onClick={() => handleDelete(v._id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${v.className} - ${v.student || "Không ghi học sinh"}`}
                  secondary={`Lỗi: ${v.violationType} | Người ghi: ${v.reporter} | Thời gian: ${new Date(
                    v.date
                  ).toLocaleString("vi-VN")}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
