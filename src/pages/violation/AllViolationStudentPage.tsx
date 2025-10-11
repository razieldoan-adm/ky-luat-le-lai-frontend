import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Violation {
  _id: string;
  studentName: string;
  className: string;
  weekNumber: number;
  violationName: string;
  time: string;
  handlingMethod?: string;
  handled: boolean;
  scoreChange: number;
}

export default function AllViolationStudentPage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [handledStatus, setHandledStatus] = useState<string>("");
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);

  // ✅ Lấy danh sách tuần học
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/academic-weeks");
        setWeeks(res.data);
        const currentWeek = res.data.find((w: AcademicWeek) => {
          const now = new Date();
          return (
            new Date(w.startDate) <= now && now <= new Date(w.endDate)
          );
        });
        if (currentWeek) {
          setSelectedWeek(String(currentWeek.weekNumber));
        }
      } catch (err) {
        console.error("Lỗi khi tải tuần học:", err);
      }
    };
    fetchWeeks();
  }, []);

  // ✅ Khi tuần thay đổi → gọi lại API lấy dữ liệu vi phạm theo tuần
  useEffect(() => {
    if (!selectedWeek) return;
    handleLoadViolationsByWeek();
  }, [selectedWeek]);

  // ✅ Hàm load vi phạm theo tuần (fetch từ backend)
  const handleLoadViolationsByWeek = async () => {
    try {
      const week = weeks.find((w) => String(w.weekNumber) === selectedWeek);
      if (!week) return;

      const res = await api.get("/api/violations/all/all-student", {
        params: {
          startDate: week.startDate,
          endDate: week.endDate,
        },
      });

      let data = res.data;
      if (selectedClass) data = data.filter((v) => v.className === selectedClass);
      if (handledStatus) data = data.filter((v) => String(v.handled) === handledStatus);

      setViolations(data);
      setFiltered(data);
    } catch (err) {
      console.error("Lỗi khi tải vi phạm theo tuần:", err);
    }
  };

  // ✅ Lọc theo lớp / trạng thái (nút Áp dụng)
  const applyFilters = () => {
    let filteredData = violations;
    if (selectedClass)
      filteredData = filteredData.filter((v) => v.className === selectedClass);
    if (handledStatus)
      filteredData = filteredData.filter(
        (v) => String(v.handled) === handledStatus
      );
    setFiltered(filteredData);
  };

  // ✅ Xóa lọc
  const clearFilters = () => {
    setSelectedClass("");
    setHandledStatus("");
    setFiltered(violations);
  };

  return (
    <Box p={3}>
      <Typography
        variant="h5"
        sx={{ fontWeight: "bold", mb: 2, textAlign: "center" }}
      >
        Danh sách tất cả học sinh vi phạm
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* Tuần học */}
          <TextField
            select
            label="Tuần học"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {weeks.map((week) => (
              <MenuItem key={week._id} value={String(week.weekNumber)}>
                Tuần {week.weekNumber} (
                {new Date(week.startDate).toLocaleDateString("vi-VN")} -{" "}
                {new Date(week.endDate).toLocaleDateString("vi-VN")})
              </MenuItem>
            ))}
          </TextField>

          {/* Lọc theo lớp */}
          <TextField
            label="Lọc theo lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 180 }}
          />

          {/* Lọc theo trạng thái */}
          <TextField
            select
            label="Tình trạng xử lý"
            value={handledStatus}
            onChange={(e) => setHandledStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="true">Đã xử lý</MenuItem>
            <MenuItem value="false">Chưa xử lý</MenuItem>
          </TextField>

          {/* Nút lọc */}
          <Button variant="contained" onClick={applyFilters}>
            Áp dụng
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Xóa lọc
          </Button>
        </Box>
      </Paper>

      {/* Bảng dữ liệu */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#90caf9" }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, index) => (
                <TableRow key={v._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{v.studentName}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.weekNumber}</TableCell>
                  <TableCell>{v.violationName}</TableCell>
                  <TableCell>
                    {new Date(v.time).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell>{v.handlingMethod || "—"}</TableCell>
                  <TableCell>
                    {v.handled ? "Đã xử lý" : "Chưa xử lý"}
                  </TableCell>
                  <TableCell>{v.scoreChange}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Không có dữ liệu phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
