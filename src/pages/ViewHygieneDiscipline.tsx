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
  IconButton,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ViewHygieneDisciplinePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);

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
      await loadRecords(wk ?? undefined);
    } catch (err) {
      console.error("Lỗi khi tải tuần hiện tại:", err);
      setCurrentWeek(null);
      setSelectedWeek("");
      await loadRecords(undefined);
    }
  };

  // --- Load records theo tuần
  const loadRecords = async (weekNumber?: number) => {
    setLoading(true);
    try {
      const params: any = {};
      if (weekNumber) params.weekNumber = weekNumber;
      const res = await api.get("/api/class-lineup-summaries/weekly", { params });
      let data = res.data;
      if (data && Array.isArray(data)) {
        setRecords(data);
      } else if (data && Array.isArray(data.records)) {
        setRecords(data.records);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeks();
  }, []);

  const handleWeekChange = (e: any) => {
    const value = e.target.value;
    setSelectedWeek(value);
    loadRecords(value || undefined);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      await loadRecords(selectedWeek || undefined);
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Không thể xóa bản ghi.");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3} fontWeight="bold">
        Danh sách vi phạm vệ sinh – nề nếp
      </Typography>

      {/* Bộ lọc tuần */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Lọc theo tuần</Typography>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="week-select-label">Chọn tuần</InputLabel>
          <Select
            labelId="week-select-label"
            label="Chọn tuần"
            value={selectedWeek}
            onChange={handleWeekChange}
          >
            <MenuItem value="">
              {currentWeek ? `Tuần ${currentWeek} (hiện tại)` : "Tuần hiện tại"}
            </MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber}
                {currentWeek === w.weekNumber ? " (hiện tại)" : ""} —{" "}
                {dayjs(w.startDate).format("DD/MM")} → {dayjs(w.endDate).format("DD/MM")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Bảng dữ liệu */}
      <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto", borderRadius: 2 }}>
        <Table size="small" sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Học sinh vi phạm</TableCell>
              <TableCell>Thời gian ghi nhận</TableCell>
              <TableCell align="center">Điểm trừ</TableCell>
              <TableCell>Ghi chú</TableCell>
              <TableCell align="center">Thao tác</TableCell>
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
                    {new Date(r.date).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "red", fontWeight: 600 }}>
                    -{Math.abs(r.scoreChange ?? 10)}
                  </TableCell>
                  <TableCell>{r.note || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton color="error" onClick={() => handleDelete(r._id)}>
                      <CloseIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
