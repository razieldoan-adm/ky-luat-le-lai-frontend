// src/pages/ClassLineUpSummaryPage.tsx

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name?: string;
  className?: string;
  tenLop?: string;
}

interface Student {
  _id: string;
  name: string;
  className: string;
}

const ClassLineUpSummaryPage = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0] // ✅ Mặc định ngày hôm nay, không hiển thị giờ
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; type: "success" | "error"; message: string }>({
    open: false,
    type: "success",
    message: "",
  });

  // 🔹 Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data || []);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // 🔹 Khi chọn lớp → load học sinh
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return;
      setLoading(true);
      try {
        const res = await api.get("/api/students", {
          params: { className: selectedClass },
        });
        setStudents(res.data || []);
      } catch (err) {
        console.error("Lỗi khi tải học sinh:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  // 🔹 Ghi nhận điểm danh (hoặc vi phạm)
  const handleSubmit = async () => {
    if (!selectedClass) {
      setAlert({ open: true, type: "error", message: "Vui lòng chọn lớp trước khi ghi nhận." });
      return;
    }

    try {
      setSaving(true);
      const recordTime = new Date(); // ✅ Ghi nhận giờ hệ thống

      await api.post("/api/lineup-records", {
        className: selectedClass,
        date: selectedDate,
        timestamp: recordTime, // ✅ Thêm giờ hệ thống vào dữ liệu gửi
      });

      setAlert({ open: true, type: "success", message: "Ghi nhận thành công!" });
    } catch (err) {
      console.error("Lỗi khi ghi nhận:", err);
      setAlert({ open: true, type: "error", message: "Lỗi khi ghi nhận dữ liệu." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Ghi nhận xếp hàng đầu giờ
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          {/* Chọn lớp */}
          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {classes.map((cls) => {
              const label = cls.name || cls.className || cls.tenLop || "Không xác định";
              return (
                <MenuItem key={cls._id} value={label}>
                  {label}
                </MenuItem>
              );
            })}
          </TextField>

          {/* Ngày (mặc định hôm nay, không hiển thị giờ) */}
          <TextField
            label="Ngày"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ minWidth: 200 }}
            InputLabelProps={{ shrink: true }}
          />

          {/* Nút ghi nhận */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={saving}
            sx={{ height: "56px" }}
          >
            {saving ? "Đang lưu..." : "Ghi nhận"}
          </Button>
        </Box>
      </Paper>

      {/* Danh sách học sinh */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Danh sách học sinh
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : students.length === 0 ? (
          <Typography color="text.secondary">Chưa có dữ liệu học sinh.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>STT</TableCell>
                <TableCell>Họ và tên</TableCell>
                <TableCell>Lớp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s, index) => (
                <TableRow key={s._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.className}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Thông báo */}
      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.type} onClose={() => setAlert({ ...alert, open: false })}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassLineUpSummaryPage;
