import { useEffect, useState } from "react";
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
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";

interface Record {
  _id: string;
  className: string;
  violation: string;
  studentName?: string;
  date: string;
  recorder?: string;
  scoreChange?: number;
  note?: string;
}

interface Absence {
  _id: string;
  studentId: string;
  studentName: string;
  className: string;
  grade: string;
  date: string;
  session: string;
  permission: boolean; // false = không phép ✅
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ViewHygieneDisciplinePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAbsence, setLoadingAbsence] = useState(false);
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "error" | "warning",
  });

useEffect(() => {
  loadWeeks();
  loadClasses();
}, []);

// 🔹 Khi đã xác định được tuần hiện tại hoặc khi user đổi tuần/lớp → load dữ liệu
useEffect(() => {
  const week = selectedWeek || currentWeek;
  if (week) {
    loadRecords(week, selectedClass || undefined);
    loadAbsences(week, selectedClass || undefined);
  }
}, [currentWeek, selectedWeek, selectedClass]);

  // --- Load tuần học + tuần hiện tại
  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách tuần:", err);
      setWeeks([]);
    }
    try {
      const cur = await api.get("/api/academic-weeks/current");
      const wk = cur.data?.weekNumber ?? null;
      setCurrentWeek(wk);
      setSelectedWeek(wk ?? "");

    } catch (err) {
      console.error("Lỗi khi tải tuần hiện tại:", err);
      setCurrentWeek(null);
      setSelectedWeek("");
    }
  };

  // --- Load danh sách lớp
  const loadClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const arr = (res.data || []).map(
        (c: any) => c.className ?? c.name ?? String(c)
      );
      setClasses(arr);
    } catch (err) {
      console.error("Lỗi khi tải danh sách lớp:", err);
      setClasses([]);


    }
  };

  // --- Load records theo tuần + lớp
  const loadRecords = async (weekNumber?: number, className?: string) => {
  setLoading(true);
  try {
    const params: any = {};
    if (weekNumber) params.weekNumber = weekNumber;
    if (className) params.className = className;

    const res = await api.get("/api/class-lineup-summaries/weekly", { params });
    const data = res.data;

    if (Array.isArray(data)) {
      setRecords(data);
    } else if (Array.isArray(data.records)) {
      setRecords(data.records);
    } else {
      setRecords([]);
    }

    console.log("📦 Dữ liệu vi phạm nhận được:", res.data);
  } catch (err) {
    console.error("Lỗi khi tải danh sách vi phạm:", err);
    setRecords([]);
  } finally {
    setLoading(false);
  }
};


  // --- Load danh sách nghỉ học không phép
const loadAbsences = async (weekNumber?: number, className?: string) => {
  setLoadingAbsence(true);
  try {
    const params: any = { permission: false };

    // 🔹 Tìm tuần đang chọn để lọc theo ngày
    if (weekNumber) {
      const week = weeks.find((w) => w.weekNumber === weekNumber);
      if (week) {
        params.startDate = dayjs(week.startDate).format("YYYY-MM-DD");
        params.endDate = dayjs(week.endDate).format("YYYY-MM-DD");
      }
      params.weekNumber = weekNumber;
    }

    // 🔹 Nếu có chọn lớp, thêm className vào params
    if (className) params.className = className;

    const res = await api.get("/api/class-attendance-summaries/unexcused", { params });
    setAbsences(res.data || []);
  } catch (err) {
    console.error("Lỗi khi tải danh sách nghỉ học:", err);
    setAbsences([]);
  } finally {
    setLoadingAbsence(false);
  }
};

  useEffect(() => {
    loadWeeks();
    loadClasses();
  }, []);

  const handleWeekChange = (e: any) => {
    const value = e.target.value;
    setSelectedWeek(value);
    loadRecords(value || undefined, selectedClass || undefined);
    loadAbsences(value || undefined, selectedClass || undefined);
  };

  const handleClassChange = (e: any) => {
    const value = e.target.value;
    setSelectedClass(value);
    loadRecords(selectedWeek || undefined, value || undefined);
    loadAbsences(selectedWeek || undefined, value || undefined);
  };

  // ✅ GVCN xác nhận có phép → cập nhật trong DB chuyên cần
  const handleExcuseAbsence = async (id: string) => {
  try {
    await api.put(`/api/class-attendance-summaries/confirm/${id}`); // ✅ Đúng route backend
    setSnackbar({
      open: true,
      message: "✅ Đã xác nhận có phép cho học sinh!",
      severity: "success",
    });
    await loadAbsences(selectedWeek || undefined, selectedClass || undefined);
  } catch (err) {
    console.error("Lỗi khi cập nhật nghỉ học:", err);
    setSnackbar({
      open: true,
      message: "❌ Lỗi khi xác nhận nghỉ học có phép!",
      severity: "error",
    });
  }
};

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3} fontWeight="bold">
        Danh sách vi phạm vệ sinh – nề nếp
      </Typography>

      {/* Bộ lọc tuần + lớp */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
        mb={2}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="week-select-label">Chọn tuần</InputLabel>
          <Select
            labelId="week-select-label"
            label="Chọn tuần"
            value={selectedWeek}
            onChange={handleWeekChange}
          >
            <MenuItem value="">
              {currentWeek
                ? `Tuần ${currentWeek} (hiện tại)`
                : "Tuần hiện tại"}
            </MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber}
                {currentWeek === w.weekNumber ? " (hiện tại)" : ""} —{" "}
                {dayjs(w.startDate).format("DD/MM")} →{" "}
                {dayjs(w.endDate).format("DD/MM")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="class-select-label">Chọn lớp</InputLabel>
          <Select
            labelId="class-select-label"
            label="Chọn lớp"
            value={selectedClass}
            onChange={handleClassChange}
          >
            <MenuItem value="">Tất cả lớp</MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Bảng vi phạm */}
      <TableContainer
        component={Paper}
        sx={{ width: "100%", overflowX: "auto", borderRadius: 2, mb: 4 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="center">Điểm trừ</TableCell>
              <TableCell>Ghi chú</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              records.map((r, idx) => (
                <TableRow key={r._id} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{r.className}</TableCell>
                  <TableCell>{r.violation}</TableCell>
                  <TableCell>{r.studentName || "-"}</TableCell>
                  <TableCell>
                    {dayjs(r.date).format("DD/MM/YYYY HH:mm")}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "red", fontWeight: 600 }}
                  >
                    -{Math.abs(r.scoreChange ?? 10)}
                  </TableCell>
                  <TableCell>{r.note || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- Danh sách nghỉ học không phép --- */}
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Danh sách học sinh nghỉ học <span style={{ color: "red" }}>không phép</span>
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#ffeaea" }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Ngày nghỉ</TableCell>
              <TableCell>Buổi</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingAbsence ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : absences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có học sinh nghỉ không phép
                </TableCell>


              </TableRow>
            ) : (
              absences.map((a, idx) => (

                <TableRow key={a._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{a.studentName}</TableCell>
                  <TableCell>{a.className}</TableCell>
                  <TableCell>{dayjs(a.date).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{a.session?.toLowerCase() === "sáng" ? "Sáng" : "Chiều"}</TableCell>
                  <TableCell sx={{ color: "red", fontWeight: 600 }}>
                    Không phép
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleExcuseAbsence(a._id)}
                    >
                      Xác nhận có phép
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
