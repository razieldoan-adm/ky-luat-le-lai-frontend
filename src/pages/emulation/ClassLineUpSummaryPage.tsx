
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
}

interface ViolationRecord {
  _id: string;
  className: string;
  studentName: string;
  violation: string;
  recorder: string;
  date: string;
  session: string;
}

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentName, setStudentName] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [violation, setViolation] = useState("");
  const [recorder, setRecorder] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [records, setRecords] = useState<ViolationRecord[]>([]);

  // --- Load danh sách lớp ---
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data.map((c: any) => c.name));
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // --- Khi chọn lớp thì load danh sách học sinh ---
  useEffect(() => {
    if (!selectedClass) return;
    const fetchStudents = async () => {
      try {
        const res = await api.get("/api/students", {
          params: { className: selectedClass },
        });
        setStudents(res.data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách học sinh:", err);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // --- Lấy danh sách vi phạm ---
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

  // --- Thêm học sinh vào danh sách tạm ---
  const handleAddStudent = () => {
    if (studentName && !selectedStudents.includes(studentName)) {
      setSelectedStudents([...selectedStudents, studentName]);
      setStudentName("");
    }
  };

  // --- Ghi nhận vi phạm ---
  const handleSave = async () => {
    if (!selectedClass || !violation || !recorder || selectedStudents.length === 0) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
      for (const name of selectedStudents) {
        await api.post("/api/class-lineup-summaries", {
          className: selectedClass,
          date: new Date(date),
          violation,
          studentName: name,
          recorder,
        });
      }
      alert("Ghi nhận thành công!");
      setSelectedStudents([]);
      loadRecords();
    } catch (err) {
      console.error("Lỗi khi lưu vi phạm:", err);
      alert("Không thể ghi nhận vi phạm.");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận vi phạm xếp hàng
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Học sinh vi phạm"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
            helperText="Nhập tên rồi nhấn Enter để thêm"
            select
          >
            {students
              .filter((s) =>
                s.name.toLowerCase().includes(studentName.toLowerCase())
              )
              .map((s) => (
                <MenuItem key={s._id} value={s.name}>
                  {s.name}
                </MenuItem>
              ))}
          </TextField>

          {selectedStudents.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography fontWeight="bold">Danh sách tạm:</Typography>
              <List dense>
                {selectedStudents.map((s) => (
                  <ListItem key={s}>
                    <ListItemText primary={s} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          <TextField
            select
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
          >
            <MenuItem value="Tập trung xếp hàng quá thời gian quy định.">
              Tập trung xếp hàng quá thời gian quy định.
            </MenuItem>
            <MenuItem value="Mất trật tự, đùa giỡn khi xếp hàng.">
              Mất trật tự, đùa giỡn khi xếp hàng.
            </MenuItem>
            <MenuItem value="Di chuyển lộn xộn không theo hàng lối.">
              Di chuyển lộn xộn không theo hàng lối.
            </MenuItem>
          </TextField>

          <TextField
            select
            label="Người ghi nhận"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
          >
            <MenuItem value="Th Huy">Th Huy</MenuItem>
            <MenuItem value="Th Nghĩa">Th Nghĩa</MenuItem>
            <MenuItem value="Th Năm">Th Năm</MenuItem>
          </TextField>

          <TextField
            label="Thời gian"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button variant="contained" color="primary" onClick={handleSave}>
            Lưu
          </Button>
        </Stack>
      </Paper>

      {/* Bảng danh sách vi phạm */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Danh sách vi phạm gần đây
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Thời gian</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Người ghi nhận</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{new Date(r.date).toLocaleString("vi-VN")}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.violation}</TableCell>
                <TableCell>{r.recorder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

