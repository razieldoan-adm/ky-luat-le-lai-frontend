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
  const [date, setDate] = useState("");
  const [session, setSession] = useState("Sáng");
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    api.get("/classes").then(res => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (selectedClass)
      api.get(`/attendance/students/${selectedClass}`).then(res => setStudents(res.data));
  }, [selectedClass]);

  const handleAdd = async () => {
    if (!selectedStudent || !selectedClass)
      return alert("Chưa chọn lớp hoặc học sinh");

    await api.post("/attendance/record", {
      className: selectedClass,
      studentName: selectedStudent.name,
      date,
      session,
      recordedBy: "GVCN",
    });

    alert("✅ Đã ghi nhận nghỉ học");
    loadRecords();
    setSelectedStudent(null);
  };

  const loadRecords = async () => {
    if (!selectedClass || !date) return;
    const res = await api.get(`/attendance/list?className=${selectedClass}&date=${date}`);
    setRecords(res.data);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận chuyên cần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select label="Lớp"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {classes.map(cls => <MenuItem key={cls} value={cls}>{cls}</MenuItem>)}
        </TextField>

        <TextField
          label="Ngày"
          type="date"
          value={date}
          onChange={(_) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          select label="Buổi"
          value={session}
          onChange={(_) => setSession(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Sáng">Sáng</MenuItem>
          <MenuItem value="Chiều">Chiều</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={loadRecords}>Xem danh sách</Button>
      </Stack>

      {selectedClass && (
        <Stack direction="row" spacing={2} mb={2}>
          <Autocomplete
            options={students}
            getOptionLabel={(option) => option.name}
            value={selectedStudent}
            onChange={(e, val) => setSelectedStudent(val)}
            sx={{ width: 250 }}
            renderInput={(params) => <TextField {...params} label="Tên học sinh" />}
          />
          <Button variant="contained" onClick={handleAdd}>Thêm nghỉ học</Button>
        </Stack>
      )}

      <Paper sx={{ mt: 2 }}>
        <Typography variant="h6" p={2}>Danh sách học sinh nghỉ</Typography>
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
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.studentId?.name}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{new Date(r.date).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  <IconButton color="error"><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
