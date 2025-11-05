import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Button,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";

export default function ViewViolationListPage() {
  const [allViolations, setAllViolations] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState("week");
  const [weeks, setWeeks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // 🔹 Lấy dữ liệu ban đầu
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [violationRes, classRes, weekRes] = await Promise.all([
          api.get("/api/violations"),
          api.get("/api/classes"),
          api.get("/api/weeks"),
        ]);
        setAllViolations(violationRes.data);
        setClasses(classRes.data);
        setWeeks(weekRes.data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        setSnackbar({ open: true, message: "Không thể tải dữ liệu!", severity: "error" });
      }
    };
    fetchData();
  }, []);

  // 🔹 Lọc dữ liệu bằng useMemo (tự động cập nhật khi các filter thay đổi)
  const filteredViolations = useMemo(() => {
    let data = [...allViolations];

    if (selectedClass) {
      data = data.filter(
        (v) =>
          v.className?.trim().toLowerCase() ===
          selectedClass.trim().toLowerCase()
      );
    }

    if (viewMode === "week" && selectedWeek) {
      const selectedWeekData = weeks.find(
        (w: any) => w.weekNumber === selectedWeek
      );
      if (selectedWeekData) {
        data = data.filter((v) => {
          const date = dayjs(v.time);
          return (
            date.isSameOrAfter(dayjs(selectedWeekData.startDate), "day") &&
            date.isSameOrBefore(dayjs(selectedWeekData.endDate), "day")
          );
        });
      }
    }

    if (viewMode === "day") {
      data = data.filter((v) => dayjs(v.time).isSame(dayjs(selectedDate), "day"));
    }

    return data;
  }, [allViolations, selectedClass, selectedWeek, selectedDate, viewMode, weeks]);

  // 🔹 Hiển thị bảng
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        QUẢN LÝ VI PHẠM CỦA HỌC SINH
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Chọn lớp"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {classes.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Chế độ xem"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="week">Theo tuần</MenuItem>
          <MenuItem value="day">Theo ngày</MenuItem>
        </TextField>

        {viewMode === "week" && (
          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            {weeks.map((w) => (
              <MenuItem key={w.weekNumber} value={w.weekNumber}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
                {dayjs(w.endDate).format("DD/MM")})
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      {/* Bảng dữ liệu */}
      <Paper>
        <TableContainer sx={{ maxHeight: 550 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>STT</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Lỗi vi phạm</TableCell>
                <TableCell>Điểm trừ</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Tiếp nhận xử lý</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredViolations.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.studentName}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.violationName}</TableCell>
                  <TableCell>{v.point}</TableCell>
                  <TableCell>{dayjs(v.time).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{v.status}</TableCell>
                  <TableCell>{v.handlingMethod || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Snackbar thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
