import { useEffect, useState } from "react";
import {
  Box, Typography, TextField, MenuItem, Button, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, Stack,
  Autocomplete, IconButton, Chip
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import api from "../../api/api";
import dayjs from "dayjs";

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("Sáng");
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState("day"); // 🔁 "day" hoặc "week"

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

  // ✅ Lấy danh sách học sinh theo lớp
  useEffect(() => {
    if (selectedClass)
      api
        .get(`/api/class-attendance-summaries/students/${selectedClass}`)
        .then((res) => setStudents(res.data))
        .catch((err) => console.error("Lỗi tải học sinh:", err));
  }, [selectedClass]);

  // ✅ Tải danh sách nghỉ học (theo ngày hoặc tuần)
  const loadRecords = async () => {
    if (!selectedClass) return;

    try {
      let query = `?className=${selectedClass}`;
      if (viewMode === "day") {
        query += `&date=${date}`;
      } else {
        // 🗓️ Tính đầu tuần - cuối tuần theo giờ VN
        const selected = dayjs(date).add(7, "hour");
        const startOfWeek = selected.startOf("week").add(1, "day").format("YYYY-MM-DD");
        const endOfWeek = selected.endOf("week").add(1, "day").format("YYYY-MM-DD");
        query += `&start=${startOfWeek}&end=${endOfWeek}`;
      }

      const res = await api.get(`/api/class-attendance-summaries/list${query}`);
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách nghỉ:", err);
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
        recordedBy: "PGT", // mặc định là PGT
        permission: false, // nghỉ không phép
      });
      alert("✅ Đã ghi nhận nghỉ học không phép");
      setSelectedStudent(null);
      loadRecords();
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
      alert("❌ Lỗi khi ghi nhận nghỉ học");
    }
  };

  // ✅ Xóa bản ghi nghỉ học
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa bản ghi này?")) return;
    await api.delete(`/api/class-attendance-summaries/${id}`);
    loadRecords();
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận chuyên cần
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
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

        <TextField
          select
          label="Chế độ xem"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="day">Xem theo ngày</MenuItem>
          <MenuItem value="week">Xem theo tuần</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={loadRecords}>
          Xem danh sách
        </Button>
      </Stack>

      {/* Autocomplete thêm học sinh */}
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

      {/* Danh sách nghỉ học */}
      <Paper sx={{ mt: 2 }}>
        <Typography variant="h6" p={2}>
          Danh sách học sinh nghỉ {viewMode === "day" ? date : "trong tuần"}
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
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Không có học sinh nghỉ
                </TableCell>
              </TableRow>
            )}
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.studentId?.name || r.studentName}</TableCell>
                <TableCell>{r.session}</TableCell>
                <TableCell>{dayjs(r.date).format("DD/MM/YYYY")}</TableCell>
                <TableCell>
                  {r.permission ? (
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
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
