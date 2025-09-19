import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

interface Violation {
  _id: string;
  description: string;
  points: number;
  handlingMethod?: string;
  createdAt?: string;
}

interface Student {
  _id: string;
  name: string;
  class: string;
  violations: Violation[];
}

export default function ViolationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] =
    useState<"success" | "error">("success");

  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await api.get(`/api/students/${id}`);
      setStudent(res.data);
    } catch (err) {
      console.error("Lỗi khi tải học sinh:", err);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    try {
      await api.delete(`/api/students/${id}/violations/${violationId}`);
      setSnackbarMessage("Xóa vi phạm thành công!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      fetchStudent();
    } catch (err) {
      console.error("Lỗi khi xóa vi phạm:", err);
      setSnackbarMessage("Xóa vi phạm thất bại!");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  // 👉 Hàm lấy ngày theo dd/mm/yyyy
  const getFormattedDate = () => {
    const today = new Date();
    const year = today.getFullYear();

    if (customDate) {
      // Nếu người dùng nhập, customDate dạng yyyy-mm-dd → tách dd/mm
      const [y, m, d] = customDate.split("-");
      return `${d}/${m}/${year}`;
    } else {
      // Nếu để trống → lấy hệ thống
      const d = String(today.getDate()).padStart(2, "0");
      const m = String(today.getMonth() + 1).padStart(2, "0");
      return `${d}/${m}/${year}`;
    }
  };

  return (
    <Box p={3}>
      <Button variant="outlined" onClick={() => navigate(-1)}>
        Quay lại
      </Button>

      {student && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            Chi tiết vi phạm - {student.name} ({student.class})
          </Typography>

          {/* Nhập thời gian vi phạm */}
          <Box mt={2} mb={2}>
            <Typography variant="subtitle1">Thời gian vi phạm:</Typography>
            <TextField
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 1 }}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Thời gian sẽ lưu: <b>{getFormattedDate()}</b>
            </Typography>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mô tả</TableCell>
                <TableCell>Điểm</TableCell>
                <TableCell>Hình thức xử lý</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {student.violations.map((v) => (
                <TableRow key={v._id}>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{v.points}</TableCell>
                  <TableCell>{v.handlingMethod || "Chưa xử lý"}</TableCell>
                  <TableCell>
                    {v.createdAt
                      ? new Date(v.createdAt).toLocaleDateString("vi-VN")
                      : "Không có"}
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      onClick={() => handleDeleteViolation(v._id)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setOpenSnackbar(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
