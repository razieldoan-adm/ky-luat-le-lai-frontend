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
  Snackbar,
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import api from "../../api/api";
import useAcademicWeeks from "../../types/useAcademicWeeks"; // ✅ Dùng hook chung

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface Class {
  _id: string;
  className: string;
  homeroomTeacher: string;
}

interface Violation {
  _id: string;
  className: string;
  penalty: number;
  weekNumber: number;
  time: string;
  handled: boolean;
  handledBy?: "GVCN" | "PGT xử lý" | null;
}

export default function ClassDisciplineTotalPage() {
  const { weeks: weekList, currentWeek } = useAcademicWeeks(); // ✅ Lấy danh sách tuần & tuần hiện tại
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [classList, setClassList] = useState<Class[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ✅ Gán tuần hiện tại mặc định
  useEffect(() => {
    if (currentWeek) {
      setSelectedWeek(currentWeek);
      checkIfCalculated(currentWeek);
    }
  }, [currentWeek]);

  // ✅ Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClassList(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // ✅ Check xem tuần đó đã có dữ liệu tổng vi phạm chưa
  const checkIfCalculated = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores/weekly", {
        params: { weekNumber },
      });
      if (res.data && res.data.length > 0) {
        setIsCalculated(true);
        setSnackbar({
          open: true,
          message: `Tuần ${weekNumber} đã có dữ liệu.`,
          severity: "info",
        });
      } else {
        setIsCalculated(false);
      }
    } catch (err) {
      console.error("Lỗi khi check tuần:", err);
    }
  };

  // ✅ Load dữ liệu vi phạm trong tuần
  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn tuần.",
        severity: "error",
      });
      return;
    }

    try {
      const weekObj = weekList.find((w) => w.weekNumber === selectedWeek);
      if (!weekObj) {
        setSnackbar({
          open: true,
          message: "Không tìm thấy thông tin tuần.",
          severity: "error",
        });
        return;
      }

      const res = await api.get("/api/violations/all/all-student");
      const data: Violation[] = res.data;

      const start = dayjs(weekObj.startDate).startOf("day");
      const end = dayjs(weekObj.endDate).endOf("day");

      // ✅ Lọc các vi phạm PGT xử lý trong tuần
      const filtered = data.filter((v) => {
        const t = dayjs(v.time);
        return (
          t.isSameOrAfter(start) &&
          t.isSameOrBefore(end) &&
          v.handled === true &&
          ["PGT", "PGT xử lý"].includes(v.handledBy ?? "")
        );
      });

      // ✅ Gom theo lớp
      const newTableData = classList.map((cls) => {
        const penalties = filtered
          .filter((v) => v.className === cls.className)
          .map((v) => v.penalty);

        return {
          className: cls.className,
          homeroomTeacher: cls.homeroomTeacher,
          penalties,
          penaltiesString: penalties.join(", "),
          total: penalties.reduce((sum, p) => sum + p, 0),
          count: penalties.length,
        };
      });

      setTableData(newTableData);
      setSnackbar({
        open: true,
        message: "Đã load dữ liệu vi phạm.",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi load vi phạm:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi tải dữ liệu.",
        severity: "error",
      });
    }
  };

  // ✅ Lưu dữ liệu vào bảng tổng
  const handleSaveData = async () => {
    if (!selectedWeek) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn tuần.",
        severity: "error",
      });
      return;
    }

    try {
      for (const row of tableData) {
        const gradeMatch = row.className.match(/^(\d+)/);
        const grade = gradeMatch ? gradeMatch[1] : "Khác";

        await api.post("/api/class-weekly-scores/update", {
          className: row.className,
          grade,
          weekNumber: selectedWeek,
          violationScore: row.total,
        });
      }

      setSnackbar({
        open: true,
        message: "✅ Đã lưu điểm vi phạm vào bảng tổng tuần.",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi lưu dữ liệu.",
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Tổng điểm vi phạm các lớp theo tuần
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }} elevation={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          {/* ✅ Hiển thị tuần hiện tại */}
          {currentWeek && (
            <Typography variant="subtitle1">
              Tuần hiện tại: {currentWeek}
            </Typography>
          )}

          <TextField
            label="Tuần"
            select
            value={selectedWeek || ""}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedWeek(val);
              setTableData([]);
              setIsCalculated(false);
              checkIfCalculated(val);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">-- Chọn tuần --</MenuItem>
            {weekList.map((w) => (
              <MenuItem key={w.weekNumber} value={w.weekNumber}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
                {dayjs(w.endDate).format("DD/MM")})
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={handleLoadData}>
            Load dữ liệu
          </Button>
          <Button variant="contained" color="success" onClick={handleSaveData}>
            Lưu
          </Button>
        </Stack>

        {isCalculated && (
          <Typography color="green" sx={{ mt: 2 }}>
            Tuần này đã có dữ liệu tổng điểm.
          </Typography>
        )}
      </Paper>

      <Paper elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#87cafe" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm vi phạm</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Số lỗi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length > 0 ? (
              tableData.map((row, i) => (
                <TableRow key={row.className}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.penaltiesString}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Chưa có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

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
