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
  const { weeks, selectedWeek, setSelectedWeek } = useAcademicWeeks();

  // ✅ Giới hạn GVCN
  const [limitGVCN, setLimitGVCN] = useState(false);
  const [classViolationLimit, setClassViolationLimit] = useState<number>(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "warning" | "error" | "success",
  });

  // ✅ Lưu danh sách lớp có HS vi phạm và lớp được chọn từ button
  const [classViolations, setClassViolations] = useState<{ className: string; count: number }[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchSetting();
    fetchClasses();
    fetchRules();
    fetchViolations();
  }, []);

  useEffect(() => {
    applyFilters(allViolations);
  }, [selectedClass, selectedWeek, selectedDate, viewMode]);

  useEffect(() => {
    if (allViolations.length === 0) return;

    let filtered = [...allViolations];
    if (viewMode === "week" && selectedWeek) {
      const selectedWeekData = weeks.find((w: any) => w.weekNumber === selectedWeek);
      if (selectedWeekData) {
        filtered = filtered.filter((v) => {
          const date = dayjs(v.time);
          return (
            date.isSameOrAfter(dayjs(selectedWeekData.startDate), "day") &&
            date.isSameOrBefore(dayjs(selectedWeekData.endDate), "day")
          );
        });
      }
    }

    if (viewMode === "day") {
      filtered = filtered.filter((v) => dayjs(v.time).isSame(dayjs(selectedDate), "day"));
    }

    const grouped = filtered.reduce((acc: Record<string, number>, v) => {
      if (!v.className) return acc;
      acc[v.className] = (acc[v.className] || 0) + 1;
      return acc;
    }, {});

    const result = Object.entries(grouped).map(([className, count]) => ({
      className,
      count,
    }));

    setClassViolations(result);
  }, [allViolations, selectedWeek, selectedDate, viewMode, weeks]);

  const fetchSetting = async () => {
    try {
      const res = await api.get("/api/settings");
      setLimitGVCN(res.data?.limitGVCNHandling ?? false);
      setClassViolationLimit(res.data?.classViolationLimit ?? 0);
    } catch (err) {
      console.error("Lỗi khi lấy setting:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const validClasses = res.data.filter((cls: any) => cls.teacher).map((cls: any) => cls.className);
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
      data = data.filter((v) => v.className.trim().toLowerCase() === selectedClass.trim().toLowerCase());
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

    if (selectedClassFilter) {
      data = data.filter((v) => v.className === selectedClassFilter);
    }

    setFilteredViolations(data);
  };

  const handleClearFilters = () => {
    setSelectedClassFilter(null);
    applyFilters(allViolations);
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
        QUẢN LÝ VI PHẠM CỦA HỌC SINH
      </Typography>

      {/* ⚠️ Mô tả cho GVCN */}
      <Box sx={{ mb: 3 }}>
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            mt: 2,
            textAlign: "left",
            whiteSpace: "pre-line",
            fontSize: "0.9rem",
            borderColor: "#ffb300",
            backgroundColor: "#fff8e1",
          }}
        >
          <strong style={{ color: "#e65100" }}>* Thầy/cô GVCN vui lòng chú ý:</strong>
          {`\n
          - Nếu thầy/cô GVCN đã xử lý vi phạm của học sinh vui lòng check vào nút "GVCN tiếp nhận".
          - Phần duyệt học sinh vi phạm, mỗi học sinh chỉ được duyệt 1 lần, từ lần thứ 2 trở đi bắt buộc bị trừ điểm thi đua của lớp.
          - Sau khi có 5 học sinh được GVCN xử lý thì lần vi phạm thứ 6 của lớp sẽ bị trừ điểm thi đua.
          * Quy định đã được BGH thông qua và áp dụng để đảm bảo công bằng.
          `}
        </Alert>
      </Box>

      {/* --- Bộ lọc --- */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField label="Chọn lớp" select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">-- Tất cả lớp --</MenuItem>
          {classList.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </TextField>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Chế độ xem</InputLabel>
          <Select value={viewMode} label="Chế độ xem" onChange={(e) => setViewMode(e.target.value as "week" | "day")}>
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
                Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} - {dayjs(w.endDate).format("DD/MM")})
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

        {/* ✅ Nút Clear */}
        <Button
          variant="contained"
          color={selectedClassFilter ? "secondary" : "primary"}
          onClick={() => {
            if (selectedClassFilter) handleClearFilters();
            else applyFilters();
          }}
        >
          {selectedClassFilter ? "Clear" : "Áp dụng"}
        </Button>
      </Stack>

      {/* ✅ DANH SÁCH LỚP CÓ HS VI PHẠM */}
      {classViolations.length > 0 && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: "#1565c0" }}>
            Các lớp có học sinh vi phạm:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {classViolations.map((cls) => (
              <Button
                key={cls.className}
                size="small"
                variant={selectedClassFilter === cls.className ? "contained" : "outlined"}
                color={cls.count >= 5 ? "error" : cls.count >= 3 ? "warning" : "primary"}
                onClick={() => {
                  setSelectedClassFilter(selectedClassFilter === cls.className ? null : cls.className);
                  setTimeout(() => applyFilters(), 0);
                }}
              >
                {`${cls.className} (${cls.count})`}
              </Button>
            ))}
          </Box>
        </Box>
      )}

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
                  <TableCell>
                    {v.handledBy === "PGT" ? (
                      <Typography color="gray" fontStyle="italic">
                        PGT đã xử lý
                      </Typography>
                    ) : !v.handled ? (
                      <Button
                        variant={v.handledBy === "GVCN" ? "contained" : "outlined"}
                        color="primary"
                        size="small"
                        onClick={async () => await handleProcessViolation(v._id, "GVCN")}
                      >
                        GVCN tiếp nhận
                      </Button>
                    ) : (
                      <Typography color="green" fontWeight="bold">
                        ✓ GVCN đã xử lý
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }} onClose={() => setSnackbar({ ...snackbar, open: false })}>
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
