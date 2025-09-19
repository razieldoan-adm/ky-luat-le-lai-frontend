import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import { useParams } from "react-router-dom";
import api from "../../api/api";

interface Violation {
  _id: string;
  type: string;
  points: number;
  handlingMethod: string;
  createdAt: string;
}

export default function ViolationDetailPage() {
  const { studentId } = useParams();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationType, setViolationType] = useState("");
  const [points, setPoints] = useState<number>(0);
  const [handlingMethod, setHandlingMethod] = useState("");
  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const res = await api.get(`/api/violations/${studentId}`);
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi tải vi phạm:", err);
    }
  };

  const handleAddViolation = async () => {
    try {
      // Nếu có nhập ngày/tháng thủ công thì tạo chuỗi dd/MM/yyyy
      let formattedDate: string;
      if (dayInput && monthInput) {
        const dd = dayInput.padStart(2, "0");
        const mm = monthInput.padStart(2, "0");
        formattedDate = `${dd}/${mm}/${currentYear}`;
      } else {
        // Nếu không nhập thì lấy ngày hệ thống
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        formattedDate = `${dd}/${mm}/${currentYear}`;
      }

      await api.post(`/api/violations/${studentId}`, {
        type: violationType,
        points,
        handlingMethod,
        violationDate: formattedDate, // Lưu dạng dd/MM/yyyy
      });

      setViolationType("");
      setPoints(0);
      setHandlingMethod("");
      setDayInput("");
      setMonthInput("");
      fetchViolations();
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Lỗi thêm vi phạm:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Chi tiết vi phạm học sinh
      </Typography>

      {/* Form thêm vi phạm */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="Loại vi phạm"
            value={violationType}
            onChange={(e) => setViolationType(e.target.value)}
            fullWidth
          />
          <TextField
            label="Điểm trừ"
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            fullWidth
          />
          <TextField
            select
            label="Hình thức xử lý"
            value={handlingMethod}
            onChange={(e) => setHandlingMethod(e.target.value)}
            fullWidth
          >
            <MenuItem value="Nhắc nhở">Nhắc nhở</MenuItem>
            <MenuItem value="Kiểm điểm">Kiểm điểm</MenuItem>
            <MenuItem value="Mời phụ huynh">Mời phụ huynh</MenuItem>
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Ngày (dd)"
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
              inputProps={{ maxLength: 2 }}
            />
            <TextField
              label="Tháng (MM)"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value)}
              inputProps={{ maxLength: 2 }}
            />
          </Stack>

          <Button variant="contained" onClick={handleAddViolation}>
            Thêm vi phạm
          </Button>
        </Stack>
      </Paper>

      {/* Bảng danh sách vi phạm */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Loại</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Xử lý</TableCell>
              <TableCell>Ngày vi phạm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v) => (
              <TableRow key={v._id}>
                <TableCell>{v.type}</TableCell>
                <TableCell>{v.points}</TableCell>
                <TableCell>{v.handlingMethod}</TableCell>
                <TableCell>{v.createdAt || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Snackbar thông báo */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity="success">Đã thêm vi phạm!</Alert>
      </Snackbar>
    </Box>
  );
}
