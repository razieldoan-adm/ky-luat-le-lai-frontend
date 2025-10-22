// ✅ src/pages/ViewViolationListPage.tsx
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
  className: string;
  description: string;
  time: Date;
  weekNumber?: number;
  handled?: boolean;
  handledBy?: string;
  studentId?: string;
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
  const { weeks, selectedWeek, setSelectedWeek} = useAcademicWeeks();

  // ✅ Cài đặt giới hạn GVCN
  const [limitGVCN, setLimitGVCN] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "warning" | "error" | "success",
  });

  useEffect(() => {
    fetchSetting();
    fetchClasses();
    fetchRules();
    fetchViolations();
  }, []);

  useEffect(() => {
    applyFilters(allViolations);
  }, [selectedClass, selectedWeek, selectedDate, viewMode]);

  const fetchSetting = async () => {
    try {
      const res = await api.get("/api/settings");
      setLimitGVCN(res.data?.limitGVCNHandling ?? false);
    } catch (err) {
      console.error("Lỗi khi lấy setting:", err);
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
          v.className.trim().toLowerCase() ===
          selectedClass.trim().toLowerCase()
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
      data = data.filter((v) =>
        dayjs(v.time).isSame(dayjs(selectedDate), "day")
      );
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

  // ✅ Tổng điểm trừ (chỉ tính PGT xử lý)
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
        Nếu GVCN đã xử lý vi phạm của học sinh vui lòng check vào nút{" "}
        <b>"GVCN tiếp nhận"</b>. Xin cám ơn.
      </Typography>

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
          <>
            <TextField
              select
              label="Chọn tuần"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              sx={{ minWidth: 150 }}
            >
              {weeks.map((w: any) => (
                <MenuItem key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} (Tuần hiện tại) ({dayjs(w.startDate).format("DD/MM")} -{" "}
                  {dayjs(w.endDate).format("DD/MM")})
                </MenuItem>
              ))}
            </TextField>
          </>
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
              <TableCell>Trạng thái</TableCell>
              <TableCell>Tiếp nhận xử lý</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{renderTime(v.time)}</TableCell>
                  <TableCell>
                    {v.handled ? (
                      <Box
                        sx={{
                          backgroundColor: "green",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Đã xử lý
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          backgroundColor: "#ffcccc",
                          color: "red",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Chưa xử lý
                      </Box>
                    )}
                  </TableCell>

                  {/* ✅ Button xử lý có giới hạn GVCN */}
                  <TableCell> {v.handledBy === "PGT" ? ( 
                    <Typography color="gray" fontStyle="italic"> 
                      PGT đã xử lý 
                    </Typography> 
                  ) : !v.handled ? (
                    <Button variant={ v.handledBy === "GVCN" ? "contained" : "outlined" 
                    }
                      color="primary" 
                      size="small" 
                      
onClick={async () => {
  // 🔹 Xác định tuần hiện tại của vi phạm này
  const currentWeek = weeks.find(
    (w: any) =>
      dayjs(v.time).isSameOrAfter(dayjs(w.startDate), "day") &&
      dayjs(v.time).isSameOrBefore(dayjs(w.endDate), "day")
  );

  // 🔹 Đếm số lần vi phạm trong cùng tuần của cùng học sinh
  const repeatCount = allViolations.filter((item) => {
    if (item.studentId !== v.studentId || item.className !== v.className) return false;
    if (!currentWeek) return false;

    return (
      dayjs(item.time).isSameOrAfter(dayjs(currentWeek.startDate), "day") &&
      dayjs(item.time).isSameOrBefore(dayjs(currentWeek.endDate), "day")
    );
  }).length;

  // 🔹 Nếu bị giới hạn GVCN và học sinh vi phạm lần >= 2 → cảnh báo
  if (limitGVCN && repeatCount > 1) {
    setSnackbar({
      open: true,
      message: "⚠️ Học sinh này đã vi phạm nhiều lần trong tuần. GVCN không thể xử lý tiếp.",
      severity: "warning",
    });
    return;
  }

  // 🔹 Cho phép GVCN xử lý bình thường
  await handleProcessViolation(v._id, "GVCN");
}}

                      > 
                      GVCN tiếp nhận 
                    </Button> 
                  ) : (
                    <Typography color="green" fontWeight="bold"> 
                      ✓ GVCN đã xử lý 
                    </Typography> )} 
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* ✅ Snackbar hiển thị cảnh báo */}
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

      {/* --- Tổng điểm trừ --- */}
      <Box mt={4}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Tổng điểm trừ:
        </Typography>
        <Table size="small" sx={{ maxWidth: 500 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>Lớp</TableCell>
              <TableCell align="right">Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(classTotals).map(([cls, total]) => (
              <TableRow key={cls}>
                <TableCell>{cls}</TableCell>
                <TableCell align="right">{total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
