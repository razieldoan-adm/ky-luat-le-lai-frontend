// ✅ src/pages/violation/RecordAttendancePage.tsx
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
import dayjs from "dayjs";
import { getWeeksAndCurrentWeek } from "../../types/weekHelper";

const RecordAttendancePage = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [grade, setGrade] = useState("");
  const [weekNumber, setWeekNumber] = useState<number>();
  const [weeks, setWeeks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // ✅ lọc trạng thái nghỉ

  useEffect(() => {
  const loadWeeks = async () => {
    const { weeks, currentWeek } = await getWeeksAndCurrentWeek();
    setWeeks(weeks);
    setWeekNumber(currentWeek);
  };
  loadWeeks();
}, []);

  // --- Lấy danh sách lớp
  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách lớp:", err);
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // --- Lấy danh sách nghỉ học
  const fetchRecords = async () => {
    if (!className) return;
    try {
      const endpoint =
        viewMode === "week"
          ? "/api/class-attendance-summaries/by-week"
          : "/api/class-attendance-summaries/by-date";

      const cleanDate = date.split(":")[0];
      const params =
        viewMode === "week"
          ? {
              className,
              weekNumber,
              grade,
              search,
              permission: statusFilter || undefined, // ✅ truyền trạng thái lọc
            }
          : {
              className,
              date: cleanDate,
              grade,
              search,
              permission: statusFilter || undefined,
            };

      const res = await api.get(endpoint, { params });
      setRecords(res.data.records || res.data || []); // ✅ hỗ trợ cả 2 kiểu trả về
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [className, date, weekNumber, viewMode, search, statusFilter]);

  // --- Xử lý duyệt nghỉ có phép
  const handleApprove = async (id: string) => {
    try {
      await api.put(`/api/class-attendance-summaries/approve/${id}`);
      fetchRecords();
    } catch (err) {
      console.error("Lỗi duyệt nghỉ:", err);
    }
  };

  // --- Xóa ghi nhận nghỉ
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này không?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      fetchRecords();
    } catch (err) {
      console.error("Lỗi xóa bản ghi:", err);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Ghi nhận nghỉ học
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select
            label="Lớp"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            sx={{ minWidth: 120 }}
            size="small"
          >
            {classes.map((c) => (
              <MenuItem key={c._id} value={c.className}>
                {c.className}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Khối"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            sx={{ minWidth: 100 }}
            size="small"
          >
            {[6, 7, 8, 9, 10, 11, 12].map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Chế độ xem"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "day" | "week")}
            sx={{ minWidth: 130 }}
            size="small"
          >
            <MenuItem value="day">Theo ngày</MenuItem>
            <MenuItem value="week">Theo tuần</MenuItem>
          </TextField>

          {viewMode === "day" ? (
            <TextField
              label="Ngày"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            />
          ) : (
            <TextField
              select
              label="Tuần"
              value={weekNumber || ""}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 120 }}
            >
              {weeks.map((w) => (
                <MenuItem key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Tìm học sinh"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />

          {/* ✅ Bộ lọc trạng thái nghỉ */}
          <TextField
            select
            label="Trạng thái nghỉ"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="true">Có phép</MenuItem>
            <MenuItem value="false">Không phép</MenuItem>
          </TextField>

          <Button variant="contained" onClick={fetchRecords}>
            Làm mới
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Lý do</TableCell>
              <TableCell>Có phép</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>
                    {dayjs(r.date).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell>{r.session}</TableCell>
                  <TableCell>{r.reason || "-"}</TableCell>
                  <TableCell>
                    {r.permission ? "Có phép" : "Không phép"}
                  </TableCell>
                  <TableCell>
                    {!r.permission && (
                      <Button
                        color="success"
                        size="small"
                        onClick={() => handleApprove(r._id)}
                        sx={{ mr: 1 }}
                      >
                        Duyệt có phép
                      </Button>
                    )}
                    <Button
                      color="error"
                      size="small"
                      onClick={() => handleDelete(r._id)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default RecordAttendancePage;
