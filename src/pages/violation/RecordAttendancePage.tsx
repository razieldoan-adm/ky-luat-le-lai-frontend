// src/pages/violation/RecordAttendancePage.tsx
import { useState, useEffect } from "react";
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
} from "@mui/material";
import api from "../../api/api";
import { getWeeksAndCurrentWeek } from "../../types/weekHelper";

interface AcademicWeek {
  _id: string;
  className: string;
  studentName: string;
  date: string;
  session: string;
  reason?: string;
  hasPermission: boolean;
}

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [mode, setMode] = useState("Theo tuần");
  const [weeks, setWeeks] = useState<number[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [studentName, setStudentName] = useState("");
  const [attendance, setAttendance] = useState<AcademicWeek[]>([]);
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/class");
        setClasses(res.data.map((c: any) => c.name));
      } catch (err) {
        console.error("Lỗi tải danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // Lấy tuần học
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const { weeks, currentWeek } = await getWeeksAndCurrentWeek();
        setWeeks(weeks);
        setCurrentWeek(currentWeek);
        setSelectedWeek(currentWeek);
      } catch (err) {
        console.error("Lỗi lấy tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  const loadAttendance = async () => {
    if (!selectedClass) return;
    try {
      const params: any = {
        className: selectedClass,
        week: selectedWeek,
        mode,
      };

      if (mode === "Theo học sinh" && studentName.trim()) {
        params.studentName = studentName.trim();
      }
      if (statusFilter !== "Tất cả") {
        params.permission = statusFilter === "Có phép";
      }

      const res = await api.get("/attendance/class", { params });
      setAttendance(res.data || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu nghỉ học:", err);
      setAttendance([]);
    }
  };

  useEffect(() => {
    if (selectedClass) loadAttendance();
  }, [selectedClass, selectedWeek, mode, statusFilter]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Ghi nhận nghỉ học
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            label="Lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Chế độ xem"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="Theo tuần">Theo tuần</MenuItem>
            <MenuItem value="Theo học sinh">Theo học sinh</MenuItem>
          </TextField>

          {mode === "Theo tuần" && (
            <TextField
              select
              label="Tuần"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              sx={{ minWidth: 100 }}
            >
              {weeks.map((w) => (
                <MenuItem key={w} value={w}>
                  Tuần {w}
                </MenuItem>
              ))}
            </TextField>
          )}

          {mode === "Theo học sinh" && (
            <TextField
              label="Tên học sinh"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              sx={{ minWidth: 200 }}
            />
          )}

          <TextField
            select
            label="Trạng thái nghỉ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="Tất cả">Tất cả</MenuItem>
            <MenuItem value="Có phép">Có phép</MenuItem>
            <MenuItem value="Không phép">Không phép</MenuItem>
          </TextField>

          <Button variant="contained" onClick={loadAttendance}>
            Làm mới
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Lý do</TableCell>
              <TableCell>Có phép</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendance.length > 0 ? (
              attendance.map((a, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{a.className}</TableCell>
                  <TableCell>{a.studentName}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.session}</TableCell>
                  <TableCell>{a.reason || "-"}</TableCell>
                  <TableCell>{a.hasPermission ? "Có phép" : "Không phép"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
