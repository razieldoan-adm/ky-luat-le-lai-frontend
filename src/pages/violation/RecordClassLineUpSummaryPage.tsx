import { useState, useEffect } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface Record {
  _id: string;
  className: string;
  studentName: string;
  violation: string;
  date: string;
  recorder: string;
  scoreChange: number;
}

export default function RecordClassLineUpSummaryPage() {
  const [className, setClassName] = useState("");
  const [violation, setViolation] = useState("");
  const [studentName, setStudentName] = useState("");
  const [recorder] = useState("Th.Huy"); // ✅ mặc định người ghi nhận
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [records, setRecords] = useState<Record[]>([]);
  const [filter, setFilter] = useState("week");

  // ✅ Lấy danh sách vi phạm
  const loadRecords = async () => {
    try {
      const res = await api.get("/api/class-lineup-summaries", {
        params: { filter },
      });
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [filter]);

  // ✅ Lưu ghi nhận
  const handleSave = async () => {
    if (!className || !violation) {
      alert("Vui lòng nhập đầy đủ thông tin lớp và lỗi vi phạm!");
      return;
    }

    try {
      const payload = { className, violation, studentName, recorder, date };
      await api.post("/api/class-lineup-summaries", payload);
      await loadRecords();
      setViolation("");
      setStudentName("");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Không thể lưu ghi nhận!");
    }
  };

  // ✅ Xóa lỗi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa lỗi này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      await loadRecords();
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Không thể xóa vi phạm!");
    }
  };

  return (
    <Box p={3}>
      {/* 🔹 Tiêu đề */}
      <Typography variant="h5" mb={2} fontWeight="bold">
        Ghi nhận lỗi xếp hàng
      </Typography>

      {/* 🔹 Form ghi nhận */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Lớp"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <TextField
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
          />
          <TextField
            label="Học sinh vi phạm (nếu có)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <TextField label="Người ghi nhận" value={recorder} disabled />
          <TextField
            label="Ngày ghi nhận"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={handleSave}>
            LƯU GHI NHẬN
          </Button>
        </Stack>
      </Paper>

      {/* 🔹 Bộ lọc + tiêu đề bảng */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Danh sách lỗi xếp hàng</Typography>
        <Select
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <MenuItem value="week">Tuần này</MenuItem>
          <MenuItem value="all">Toàn bộ</MenuItem>
        </Select>
      </Box>

      {/* 🔹 Bảng dữ liệu */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Ngày</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>Lỗi</TableCell>
            <TableCell>Học sinh</TableCell>
            <TableCell>Người ghi nhận</TableCell>
            <TableCell>Điểm trừ</TableCell>
            <TableCell>Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r._id}>
              <TableCell>{new Date(r.date).toLocaleDateString("vi-VN")}</TableCell>
              <TableCell>{r.className}</TableCell>
              <TableCell>{r.violation}</TableCell>
              <TableCell>{r.studentName}</TableCell>
              <TableCell>{r.recorder}</TableCell>
              <TableCell sx={{ color: "red" }}>{r.scoreChange}</TableCell>
              <TableCell>
                <Button color="error" onClick={() => handleDelete(r._id)}>
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
