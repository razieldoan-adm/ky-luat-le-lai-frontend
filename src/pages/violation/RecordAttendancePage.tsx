import { useEffect, useState } from "react";
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
  TableContainer,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";
import { Check, Delete } from "@mui/icons-material";
import api from "../../api/api";

export default function RecordAttendancePage() {
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedClassView, setSelectedClassView] = useState<string | null>(null);
  const [showAllAbsences, setShowAllAbsences] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // --- Lấy danh sách nghỉ học theo tuần
  const fetchRecords = async () => {
    if (!viewWeek) return;
    try {
      const res = await api.get(`/api/class-attendance-summaries/by-week`, {
        params: { week: viewWeek },
      });
      const data = res.data.records || res.data || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Lỗi tải danh sách:", err);
      setRecords([]);
      setSnackbar({
        open: true,
        message: "Không thể tải danh sách điểm danh!",
        severity: "error",
      });
    }
  };

  // --- Gọi API khi chọn tuần
  useEffect(() => {
    fetchRecords();
  }, [viewWeek]);

  // --- Duyệt phép
  const handleExcuse = async (id: string) => {
    try {
      await api.put(`/api/class-attendance-summaries/approve/${id}`);
      setSnackbar({
        open: true,
        message: "✅ Đã duyệt phép cho học sinh.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi duyệt phép:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi duyệt phép.",
        severity: "error",
      });
    }
  };

  // --- Xóa ghi nhận
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa ghi nhận này không?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      setSnackbar({
        open: true,
        message: "✅ Đã xóa ghi nhận.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi xóa:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi xóa ghi nhận.",
        severity: "error",
      });
    }
  };

  // --- Gom nhóm bản ghi theo lớp
  const groupedByClass = records.reduce((acc: any, rec: any) => {
    if (!acc[rec.className]) acc[rec.className] = [];
    acc[rec.className].push(rec);
    return acc;
  }, {});

  // --- Dữ liệu hiển thị (nếu chọn “xem toàn bộ học sinh nghỉ” thì không lọc theo lớp)
  const displayRecords = showAllAbsences
    ? records
    : selectedClassView
    ? groupedByClass[selectedClassView] || []
    : [];

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Danh sách học sinh nghỉ học theo tuần
      </Typography>

      {/* Bộ lọc */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            label="Chọn tuần"
            select
            size="small"
            value={viewWeek || ""}
            onChange={(e) => setViewWeek(Number(e.target.value))}
            sx={{ width: 200 }}
          >
            {[...Array(20)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                Tuần {i + 1}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            color="primary"
            onClick={fetchRecords}
            disabled={!viewWeek}
          >
            Xem dữ liệu
          </Button>

          <Button
            variant={showAllAbsences ? "contained" : "outlined"}
            onClick={() => setShowAllAbsences(!showAllAbsences)}
          >
            {showAllAbsences ? "Ẩn xem toàn bộ" : "Xem toàn bộ học sinh nghỉ"}
          </Button>
        </Stack>
      </Paper>

      {/* Hiển thị danh sách */}
      {records.length === 0 ? (
        <Typography color="gray" mt={2}>
          {viewWeek ? "Không có học sinh nghỉ học trong tuần này." : "Vui lòng chọn tuần."}
        </Typography>
      ) : (
        <>
          {!showAllAbsences && (
            <Box>
              <Typography fontWeight="bold" mb={1}>
                Các lớp có học sinh nghỉ học:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                {Object.keys(groupedByClass).map((cls) => (
                  <Button
                    key={cls}
                    variant={selectedClassView === cls ? "contained" : "outlined"}
                    onClick={() => setSelectedClassView(cls)}
                  >
                    {cls} ({groupedByClass[cls].length})
                  </Button>
                ))}
              </Stack>
            </Box>
          )}

          {showAllAbsences || selectedClassView ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                {showAllAbsences
                  ? "Toàn bộ học sinh nghỉ học"
                  : `Danh sách nghỉ học - ${selectedClassView}`}
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>STT</TableCell>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Họ tên</TableCell>
                      <TableCell>Buổi</TableCell>
                      <TableCell>Ngày</TableCell>
                      <TableCell>Phép</TableCell>
                      <TableCell>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayRecords.map((r: any, i: number) => (
                      <TableRow key={r._id || i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.studentName}</TableCell>
                        <TableCell>{r.session || "-"}</TableCell>
                        <TableCell>{r.date || "-"}</TableCell>
                        <TableCell>
                          {r.permission ? (
                            <Typography color="green">Có phép</Typography>
                          ) : (
                            <Typography color="error">Không phép</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {!r.permission && (
                              <IconButton color="success" onClick={() => handleExcuse(r._id)}>
                                <Check />
                              </IconButton>
                            )}
                            <IconButton color="error" onClick={() => handleDelete(r._id)}>
                              <Delete />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : null}
        </>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
