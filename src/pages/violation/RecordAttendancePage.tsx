import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import type { AlertColor } from "@mui/material";
dayjs.extend(isoWeek);

interface Student {
  _id: string;
  fullName: string;
  className: string;
}

interface Attendance {
  _id?: string;
  studentId: string;
  date: string;
  hasPermission: boolean;
}

export default function RecordAttendancePage() {
  const [className, setClassName] = useState("6A1");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [viewMode, setViewMode] = useState("day"); // "day" | "week"
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
 const [snackbar, setSnackbar] = useState<{
  open: boolean;
  message: string;
  severity: AlertColor;
}>({
  open: false,
  message: "",
  severity: "success",
});

  // ✅ Load danh sách học sinh (đúng API backend thật)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/api/students?className=${className}`);
        setStudents(res.data);
      } catch (err) {
        console.error("Lỗi tải danh sách học sinh:", err);
      }
    };
    fetchStudents();
  }, [className]);

  // ✅ Load dữ liệu điểm danh (theo ngày hoặc tuần)
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        let url = `/api/class-attendance-summaries/list?className=${className}`;
        if (viewMode === "day") {
          url += `&date=${selectedDate}`;
        } else {
          const startOfWeek = dayjs(selectedDate).startOf("week").format("YYYY-MM-DD");
          const endOfWeek = dayjs(selectedDate).endOf("week").format("YYYY-MM-DD");
          url += `&from=${startOfWeek}&to=${endOfWeek}`;
        }
        const res = await api.get(url);
        setAttendances(res.data || []);
      } catch (err) {
        console.error("Lỗi tải danh sách điểm danh:", err);
      }
    };
    fetchAttendance();
  }, [className, selectedDate, viewMode]);

  // ✅ Ghi nhận nghỉ học
  const handleRecord = async (studentId: string, hasPermission: boolean) => {
    try {
      await api.post("/api/class-attendance-summaries/record", {
        studentId,
        className,
        date: selectedDate,
        hasPermission,
      });
      setSnackbar({ open: true, message: "Ghi nhận thành công", severity: "success" });
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
      setSnackbar({ open: true, message: "Lỗi khi ghi nhận", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Ghi nhận nghỉ học
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            label="Lớp"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            size="small"
          >
            <MenuItem value="6A1">6A1</MenuItem>
            <MenuItem value="6A2">6A2</MenuItem>
            <MenuItem value="6A3">6A3</MenuItem>
          </TextField>

          <FormControl size="small">
            <InputLabel>Xem theo</InputLabel>
            <Select
              value={viewMode}
              label="Xem theo"
              onChange={(e) => setViewMode(e.target.value)}
            >
              <MenuItem value="day">Ngày</MenuItem>
              <MenuItem value="week">Tuần</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            label={viewMode === "day" ? "Ngày" : "Ngày trong tuần"}
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell align="center">Nghỉ có phép</TableCell>
              <TableCell align="center">Nghỉ không phép</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => {
              const record = attendances.find((a) => a.studentId === student._id);
              return (
                <TableRow key={student._id}>
                  <TableCell>{student.fullName}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant={record?.hasPermission ? "contained" : "outlined"}
                      color="success"
                      onClick={() => handleRecord(student._id, true)}
                    >
                      Có phép
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant={!record?.hasPermission ? "contained" : "outlined"}
                      color="error"
                      onClick={() => handleRecord(student._id, false)}
                    >
                      Không phép
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
