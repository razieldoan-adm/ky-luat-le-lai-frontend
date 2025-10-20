import { useState, useEffect } from "react";
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
  Stack,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import useAcademicWeeks from "../types/useAcademicWeeks";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface Violation {
  _id: string;
  name: string;
  studentId: string;
  className: string;
  description: string;
  time: Date;
  weekNumber?: number;
  handled?: boolean;
  handledBy?: string;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

export default function ViewViolationListPage() {
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [limitGVCN, setLimitGVCN] = useState(false);

  const { weeks, selectedWeek, setSelectedWeek } = useAcademicWeeks();

  useEffect(() => {
    fetchClasses();
    fetchRules();
    fetchViolations();
    fetchSetting();
  }, []);

  useEffect(() => {
    applyFilters(allViolations);
  }, [selectedClass, selectedWeek, selectedDate, viewMode]);

  const fetchSetting = async () => {
    try {
      const res = await api.get("/api/settings");
      setLimitGVCN(res.data.limitGVCNHandling ?? false);
    } catch (err) {
      console.error("Lỗi khi lấy cài đặt GVCN:", err);
    }
  };

  const toggleLimitGVCN = async () => {
    try {
      const newValue = !limitGVCN;
      setLimitGVCN(newValue);
      await api.put("/api/settings/updateSetting", { limitGVCNHandling: newValue });
      setSnackbar({
        open: true,
        message: `✅ Đã ${newValue ? "bật" : "tắt"} giới hạn GVCN`,
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi cập nhật giới hạn GVCN:", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi cập nhật giới hạn GVCN",
        severity: "error",
      });
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const validClasses = res.data
        .filter((cls: any) => cls.teacher)
        .map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get("/api/rules");
      setRules(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy rules:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations/all/all-student");
      const data = res.data.map((v: any) => ({
        ...v,
        handledBy: v.handledBy || "",
        handled: v.handled || false,
      }));
      setAllViolations(data);
      applyFilters(data);
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu vi phạm:", err);
    }
  };

  const applyFilters = (sourceData = allViolations) => {
    let data = [...sourceData];
    if (selectedClass) {
      data = data.filter(
        (v) =>
          v.className.trim().toLowerCase() === selectedClass.trim().toLowerCase()
      );
    }
    if (viewMode === "week" && selectedWeek) {
      const selectedWeekData = weeks.find((w: any) => w.weekNumber === selectedWeek);
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
    setFilteredViolations(data);
  };

  const handleProcessViolation = async (id: string, by: "GVCN" | "PGT") => {
    try {
      await api.patch(`/api/violations/${id}/handle`, {
        handled: true,
        handledBy: by,
        handlingMethod: `${by} xử lý`,
      });
      await fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xử lý vi phạm:", err);
    }
  };

  const renderTime = (date: Date) => dayjs(date).format("DD/MM/YYYY");

  const classTotals: Record<string, number> = {};
  filteredViolations.forEach((v) => {
    const matchedRule = rules.find((r) => r.title === v.description);
    const point = matchedRule?.point || 0;
    if (v.handledBy === "PGT") {
      classTotals[v.className] = (classTotals[v.className] || 0) + point;
    }
  });

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", py: 4 }}>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        Quản lý xử lý vi phạm học sinh
      </Typography>

      <Typography align="center" sx={{ color: "gray", mb: 2 }}>
        Nếu GVCN đã xử lý vi phạm của học sinh vui lòng click vào nút{" "}
        <b>“GVCN”</b> để xác nhận tiếp nhận.
      </Typography>

      {/* 🔘 Bật/tắt giới hạn GVCN */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <FormControlLabel
          control={<Switch checked={limitGVCN} onChange={toggleLimitGVCN} />}
          label="Giới hạn xử lý của GVCN khi học sinh vi phạm nhiều lần"
        />
      </Box>

      {/* --- Bộ lọc --- */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          label="Chọn lớp"
          select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">-- Tất cả lớp --</MenuItem>
          {classList.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </TextField>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Chế độ xem</InputLabel>
          <Select
            value={viewMode}
            label="Chế độ xem"
            onChange={(e) => setViewMode(e.target.value as "week" | "day")}
          >
            <MenuItem value="week">Theo tuần</MenuItem>
            <MenuItem value="day">Theo ngày</MenuItem>
          </Select>
        </FormControl>

        {viewMode === "week" && (
          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          >
            {weeks.map((w: any) => (
              <MenuItem key={w.weekNumber} value={w.weekNumber}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
                {dayjs(w.endDate).format("DD/MM")})
              </MenuItem>
            ))}
          </TextField>
        )}

        {viewMode === "day" && (
          <TextField
            label="Chọn ngày"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ minWidth: 180 }}
          />
        )}

        <Button variant="contained" onClick={() => applyFilters()}>
          Áp dụng
        </Button>
      </Stack>

      {/* --- Bảng dữ liệu --- */}
      <Paper elevation={3} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#87cafe" }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Xử lý</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              const repeatCount = allViolations.filter(
                (item) =>
                  item.studentId === v.studentId && item.weekNumber === v.weekNumber
              ).length;

              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{renderTime(v.time)}</TableCell>
                  <TableCell>
                    <Button
                      variant={v.handledBy === "GVCN" ? "contained" : "outlined"}
                      color="primary"
                      size="small"
                      onClick={() => {
                        if (limitGVCN && repeatCount > 1) {
                          setSnackbar({
                            open: true,
                            message:
                              "⚠️ Học sinh này đã vi phạm nhiều lần trong tuần. GVCN không được phép xử lý.",
                            severity: "warning",
                          });
                          return;
                        }
                        handleProcessViolation(v._id, "GVCN");
                      }}
                    >
                      GVCN
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* 🔔 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity as any} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
