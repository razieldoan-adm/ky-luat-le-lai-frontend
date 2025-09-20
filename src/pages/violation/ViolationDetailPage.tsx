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
  description: string;
  handlingMethod: string;
  time: string;
}

interface Rule {
  _id: string;
  title: string;
  score: number;
  handlingMethod: string;
}

export default function ViolationDetailPage() {
  const { studentId } = useParams();
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [autoHandlingMethod, setAutoHandlingMethod] = useState("");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resStudent = await api.get(`/api/students/${studentId}`);
        setStudentName(resStudent.data.name);
        setClassName(resStudent.data.className);

        const resViolations = await api.get(`/api/violations/student/${studentId}`);
        setViolations(resViolations.data);

        const resRules = await api.get("/api/rules");
        setRules(resRules.data);

        const resWeek = await api.get("/api/settings/current-week");
        setWeekNumber(resWeek.data.weekNumber);
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      }
    };
    fetchData();
  }, [studentId]);

  // ✅ Trả về ISO string để backend lưu chuẩn
  const getFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();

    if (dayInput && monthInput) {
      const dd = parseInt(dayInput, 10);
      const mm = parseInt(monthInput, 10) - 1; // tháng trong JS từ 0
      const customDate = new Date(year, mm, dd);

      if (isNaN(customDate.getTime())) return now.toISOString();
      return customDate.toISOString();
    }

    return now.toISOString();
  };

  const handleAddViolation = async () => {
    if (!selectedRule || !weekNumber) return;

    try {
      await api.post("/api/violations", {
        studentId,
        name: studentName,
        className,
        description: selectedRule.title,
        handlingMethod: autoHandlingMethod,
        weekNumber,
        time: getFormattedDate(),
        handled: false,
      });

      const res = await api.get(`/api/violations/student/${studentId}`);
      setViolations(res.data);

      setSnackbar({ open: true, message: "Thêm vi phạm thành công!", severity: "success" });
    } catch (err) {
      console.error("Lỗi thêm vi phạm:", err);
      setSnackbar({ open: true, message: "Lỗi thêm vi phạm!", severity: "error" });
    }
  };

  const handleDeleteViolation = async (id: string) => {
    try {
      await api.delete(`/api/violations/${id}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
      setSnackbar({ open: true, message: "Xóa vi phạm thành công!", severity: "success" });
    } catch (err) {
      console.error("Lỗi xóa vi phạm:", err);
      setSnackbar({ open: true, message: "Lỗi xóa vi phạm!", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Chi tiết vi phạm của học sinh: {studentName} ({className})
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Thêm vi phạm</Typography>
        <Stack direction="row" spacing={2} mt={2}>
          <TextField
            select
            label="Chọn lỗi vi phạm"
            value={selectedRule ? selectedRule._id : ""}
            onChange={(e) => {
              const rule = rules.find((r) => r._id === e.target.value) || null;
              setSelectedRule(rule);
              setAutoHandlingMethod(rule ? rule.handlingMethod : "");
            }}
            sx={{ minWidth: 250 }}
          >
            {rules.map((rule) => (
              <MenuItem key={rule._id} value={rule._id}>
                {rule.title} (Điểm: {rule.score})
              </MenuItem>
            ))}
          </TextField>

          <TextField label="Ngày (dd)" value={dayInput} onChange={(e) => setDayInput(e.target.value)} sx={{ width: 100 }} />
          <TextField label="Tháng (mm)" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} sx={{ width: 100 }} />

          <TextField label="Hình thức xử lý" value={autoHandlingMethod} disabled sx={{ minWidth: 180 }} />

          <Button variant="contained" onClick={handleAddViolation}>
            Thêm
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Danh sách vi phạm</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mô tả</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v) => (
              <TableRow key={v._id}>
                <TableCell>{v.description}</TableCell>
                <TableCell>{v.handlingMethod}</TableCell>
                <TableCell>{new Date(v.time).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell>
                  <Button color="error" onClick={() => handleDeleteViolation(v._id)}>
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

