// src/pages/violation/RecordAttendancePage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import api from "../../api/api";
import { getWeeksAndCurrentWeek } from "../../types/weekHelper";

interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  className: string;
  grade: number;
  date: string;
  session: string;
  permission: boolean;
  weekNumber: number;
}

export default function RecordAttendancePage() {
  const [absences, setAbsences] = useState<AttendanceRecord[]>([]);
  const [weeks, setWeeks] = useState<{ weekNumber: number; start: string; end: string }[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<{ _id: string; name: string }[]>([]);

  // ✅ Lấy danh sách tuần
  useEffect(() => {
    const { weeks, currentWeek } = getWeeksAndCurrentWeek();
    setWeeks(weeks);
    setCurrentWeek(currentWeek);
  }, []);

  // ✅ Load danh sách lớp
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data.map((c: any) => c.name));
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  // ✅ Load danh sách học sinh khi chọn lớp
  useEffect(() => {
    if (!selectedClass) return;
    const loadStudents = async () => {
      try {
        const res = await api.get(`/api/students/by-class/${selectedClass}`);
        setStudents(res.data || []);
      } catch (err) {
        console.error("Lỗi khi tải học sinh:", err);
        setStudents([]);
      }
    };
    loadStudents();
  }, [selectedClass]);

  // ✅ Hàm load danh sách nghỉ học
  const loadAbsences = async () => {
    setLoading(true);
    try {
      let url = "/api/class-attendance-summaries";
      const params: any = {};
      if (selectedWeek) params.weekNumber = selectedWeek;
      if (selectedDate) params.date = selectedDate;
      if (selectedClass) params.className = selectedClass;

      const res = await api.get(url, { params });
      setAbsences(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nghỉ học:", err);
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Khi chọn học sinh: hiển thị tất cả ngày nghỉ của học sinh đó (cả phép + không phép)
  const loadStudentAbsences = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/class-attendance-summaries/by-student/${studentId}`);
      setAbsences(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải nghỉ học học sinh:", err);
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Tự load dữ liệu khi đổi tuần hoặc ngày
  useEffect(() => {
    if (selectedStudent) {
      loadStudentAbsences(selectedStudent);
    } else {
      loadAbsences();
    }
  }, [selectedWeek, selectedDate, selectedClass, selectedStudent]);

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận nghỉ học học sinh
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(e.target.value === "" ? "" : Number(e.target.value));
              setSelectedDate("");
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w.weekNumber} value={w.weekNumber}>
                Tuần {w.weekNumber} ({w.start} → {w.end})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Chọn ngày"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedWeek("");
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            select
            label="Lớp"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudent("");
            }}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Học sinh"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {students.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" color="primary" onClick={loadAbsences}>
            Tải lại
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : absences.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            Không có dữ liệu nghỉ học
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Họ tên</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Buổi</TableCell>
                <TableCell align="center">Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {absences.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>{a.studentName}</TableCell>
                  <TableCell>{a.className}</TableCell>
                  <TableCell>{new Date(a.date).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell>{a.session}</TableCell>
                  <TableCell align="center">
                    {a.permission ? (
                      <Typography color="green">Có phép</Typography>
                    ) : (
                      <Typography color="red">Không phép</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
