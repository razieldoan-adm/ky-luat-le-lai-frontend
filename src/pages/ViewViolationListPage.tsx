import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";
import useAcademicWeeks from "../types/useAcademicWeeks";

interface Violation {
  _id: string;
  studentId: string;
  studentName: string;
  className: string;
  weekNumber: number;
  date: string;
  time: string;
  violationType: string;
  penalty: number;
  handled: boolean;
  handledBy?: string | null;
}

export default function ViewViolationListPage() {
  const { weeks, currentWeek } = useAcademicWeeks();
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek || 1);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [limitGVCN, setLimitGVCN] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // 🔹 Lấy setting hệ thống
  useEffect(() => {
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const res = await api.get("/api/settings");
      setLimitGVCN(res.data.limitGVCNHandling ?? false);
    } catch (err) {
      console.error("Lỗi khi lấy setting:", err);
    }
  };

  // 🔹 Tải danh sách vi phạm theo tuần
  useEffect(() => {
    loadViolations(selectedWeek);
  }, [selectedWeek]);

  const loadViolations = async (week?: number) => {
    try {
      const res = await api.get("/api/violations/all/all-student", {
        params: week ? { weekNumber: week } : {},
      });
      setViolations(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
      setViolations([]);
    }
  };

  const handleProcessViolation = async (id: string, handler: string) => {
    try {
      await api.put(`/api/violations/${id}/handle`, {
        handled: true,
        handledBy: handler,
      });
      setSnackbar({
        open: true,
        message: `✅ Đã xử lý vi phạm bằng ${handler}`,
        severity: "success",
      });
      loadViolations(selectedWeek);
    } catch (err) {
      console.error("Lỗi khi xử lý:", err);
      setSnackbar({
        open: true,
        message: "❌ Lỗi khi xử lý vi phạm",
        severity: "error",
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Danh sách vi phạm học sinh
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">
            Tuần hiện tại: {currentWeek}
          </Typography>

          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            sx={{ minWidth: 180 }}
          >
            {weeks.map((w: any) => (
              <MenuItem key={w.weekNumber} value={w.weekNumber}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
                {dayjs(w.endDate).format("DD/MM")})
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            onClick={() => loadViolations(selectedWeek)}
          >
            Làm mới
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#87cafe" }}>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Loại vi phạm</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Xử lý</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {violations.length > 0 ? (
              violations.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.studentName}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{dayjs(v.date).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{v.violationType}</TableCell>
                  <TableCell>{v.penalty}</TableCell>
                  <TableCell>
                    {/* ⚙️ GVCN xử lý */}
                    <Button
                      variant={
                        v.handledBy === "GVCN" ? "contained" : "outlined"
                      }
                      color="primary"
                      size="small"
                      onClick={() => {
                        const repeatCount = violations.filter(
                          (item) =>
                            item.studentId === v.studentId &&
                            item.weekNumber === v.weekNumber
                        ).length;

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

                    {/* ⚙️ PGT xử lý */}
                    <Button
                      variant={
                        v.handledBy === "PGT" ? "contained" : "outlined"
                      }
                      color="secondary"
                      size="small"
                      sx={{ ml: 1 }}
                      onClick={() => handleProcessViolation(v._id, "PGT")}
                    >
                      PGT
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* 🔔 Snackbar hiển thị cảnh báo */}
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
