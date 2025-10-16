import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, MenuItem, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, Stack,
  Autocomplete, IconButton
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "../../api/api";

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // mặc định hôm nay
  const [session, setSession] = useState("Sáng");
  const [records, setRecords] = useState<any[]>([]);

  // 🏫 Lấy danh sách lớp
  useEffect(() => {
    api.get("/classes").then(res => setClasses(res.data));
  }, []);

  // 👩‍🏫 Lấy danh sách học sinh theo lớp
  useEffect(() => {
    if (selectedClass) {
      api.get(`/attendance/students/${selectedClass}`).then(res => setStudents(res.data));
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  // ➕ Thêm học sinh nghỉ học
  const handleAdd = async () => {
    if (!selectedStudent || !selectedClass) {
      alert("⚠️ Chưa chọn lớp hoặc học sinh");
      return;
    }

    await api.post("/attendance/record", {
      className: selectedClass,
      studentName: selectedStudent.name,
      date,
      session,
      recordedBy: "GVCN",
    });

    alert("✅ Đã ghi nhận nghỉ học");
    setSelectedStudent(null);
    loadRecords();
  };

  // 🔁 Tải danh sách nghỉ học
  const loadRecords = async () => {
    if (!selectedClass || !date) return;
    const res = await api.get(`/attendance/list?className=${selectedClass}&date=${date}`);
    setRecords(res.data);
  };

  // ❌ Xóa bản ghi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xoá bản ghi này?")) return;
    await api.delete(`/attendance/${id}`);
    loadRecords();
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận chuyên cần
      </Typography>

      {/* Bộ lọc lớp / ngày / buổi */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Lớp"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
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
          select
          label="Buổi"
          value={session}
          onChange={(e) => setSession(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Sáng">Sáng</MenuItem>
          <MenuItem value="Chiều">Chiều</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={loadRecords}>
          Xem danh sách
        </Button>
      </Stack>

      {/* Ô chọn học sinh */}
      {selectedClass && (
        <Stack direction="row" spacing={2} mb={2}>
          <Autocomplete
            options={students}
            getOptionLabel={(option) => option.name}
            value={selectedStudent}
            onChange={(_, val) => setSelectedStudent(val)}
            sx={{ width: 250 }}
            renderInput={(params) => <TextField {...params} label="Tên học sinh" />}
          />
          <Button variant="contained" onClick={handleAdd}>
            Thêm nghỉ học
          </Button>
        </Stack>
      )}

      {/* Bảng danh sách nghỉ học */}
      <Paper sx={{ mt: 2 }}>
        <Typography variant="h6" p={2}>
          Danh sách học sinh nghỉ
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
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
    </Box>
  );
}
