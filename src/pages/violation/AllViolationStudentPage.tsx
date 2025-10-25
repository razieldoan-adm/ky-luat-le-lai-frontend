import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TablePagination,
} from "@mui/material";
import { useState, useEffect } from "react";
import api from "../../api/api";
import { getWeeksAndCurrentWeek } from "../../types/weekHelper";

const AllViolationStudentPage = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [settings, setSettings] = useState({
    limitGVCNHandling: 0,
    classViolationLimit: 0,
  });
  const [limitGVCNHandling, setLimitGVCNHandling] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 🔹 Trạng thái chỉnh sửa giới hạn

  useEffect(() => {
    const { weeks, currentWeek } = getWeeksAndCurrentWeek();
    setWeeks(weeks);
    setSelectedWeek(currentWeek);
  }, []);

  useEffect(() => {
    fetchViolations();
    fetchSettings();
  }, [selectedWeek]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/violations", {
        params: { weekNumber: selectedWeek },
      });
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      const data = res.data;
      setSettings({
        limitGVCNHandling: data.limitGVCNHandling || 0,
        classViolationLimit: data.classViolationLimit || 0,
      });
      setLimitGVCNHandling(data.limitGVCNHandlingEnabled || false);
    } catch (err) {
      console.error("Lỗi khi tải settings:", err);
    }
  };

  // ✅ Bật/tắt giới hạn GVCN
  const handleToggle = async () => {
    const newValue = !limitGVCNHandling;
    setLimitGVCNHandling(newValue);
    setLoading(true);
    try {
      await api.put("/api/settings/update", { limitGVCNHandling: newValue });
      setSnackbar({
        open: true,
        message: "Đã cập nhật trạng thái giới hạn GVCN",
        severity: "success",
      });
    } catch (err) {
      console.error("Lỗi khi cập nhật setting:", err);
      setLimitGVCNHandling(!newValue);
      setSnackbar({
        open: true,
        message: "Lỗi cập nhật giới hạn",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cập nhật giới hạn tuần & lớp
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await api.put("/api/settings/update", settings);
      setSnackbar({
        open: true,
        message: "Đã lưu cấu hình giới hạn thành công!",
        severity: "success",
      });
      setIsEditing(false); // 🔒 Khóa lại sau khi lưu
    } catch (err) {
      console.error("Lỗi khi lưu settings:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi lưu cấu hình!",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        📋 Tổng hợp vi phạm học sinh
      </Typography>

      {/* ⚙️ Giới hạn xử lý */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }} elevation={3}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            color={limitGVCNHandling ? "success" : "error"}
            onClick={handleToggle}
            disabled={loading}
            sx={{ borderRadius: "50px" }}
          >
            {limitGVCNHandling
              ? "🟢 GIỚI HẠN GVCN: BẬT"
              : "🔴 GIỚI HẠN GVCN: TẮT"}
          </Button>

          <TextField
            label="Số lần GVCN xử lý/HS/tuần"
            type="number"
            size="small"
            sx={{ width: 200 }}
            value={settings.limitGVCNHandling}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                limitGVCNHandling: Number(e.target.value),
              }))
            }
            disabled={!isEditing || loading}
          />

          <TextField
            label="Tổng lượt GVCN xử lý/lớp/tuần"
            type="number"
            size="small"
            sx={{ width: 230 }}
            value={settings.classViolationLimit}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                classViolationLimit: Number(e.target.value),
              }))
            }
            disabled={!isEditing || loading}
          />

          {isEditing ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? "Đang lưu..." : "Lưu"}
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setIsEditing(true)} // 🔓 bật chỉnh sửa
            >
              Điều chỉnh
            </Button>
          )}
        </Stack>
      </Paper>

      {/* 🔹 Chọn tuần */}
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="body1">Chọn tuần:</Typography>
        <TextField
          select
          size="small"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ width: 150 }}
          SelectProps={{ native: true }}
        >
          {weeks.map((w) => (
            <option key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </option>
          ))}
        </TextField>
      </Stack>

      {/* 📊 Bảng vi phạm */}
      <Paper sx={{ borderRadius: 3, p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Họ và tên</TableCell>
                  <TableCell>Lớp</TableCell>
                  <TableCell>Lỗi vi phạm</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Người xử lý</TableCell>
                  <TableCell>Hình thức xử lý</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  violations
                    .slice(
                      page * rowsPerPage,
                      page * rowsPerPage + rowsPerPage
                    )
                    .map((v, i) => (
                      <TableRow key={v._id}>
                        <TableCell>{page * rowsPerPage + i + 1}</TableCell>
                        <TableCell>{v.studentName}</TableCell>
                        <TableCell>{v.className}</TableCell>
                        <TableCell>{v.violationType}</TableCell>
                        <TableCell>
                          {new Date(v.date).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell>{v.handledBy}</TableCell>
                        <TableCell>{v.handlingMethod}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={violations.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Số dòng / trang"
            />
          </>
        )}
      </Paper>

      {/* 🔔 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity as "success" | "error"}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AllViolationStudentPage;
