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
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
  conductScore: number;
}

interface Violation {
  _id: string;
  violationName: string;
  points: number;
  handlingMethod: string;
}

interface StudentViolation {
  _id: string;
  violation: Violation;
  time: string;
  handlingMethod: string;
  status: string;
  points: number;
  week: number;
}

const ViolationDetailPage = () => {
  const { studentId } = useParams(); // ✅ bỏ className để không bị cảnh báo
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [violations, setViolations] = useState<StudentViolation[]>([]);
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [selectedViolation, setSelectedViolation] = useState("");
  const [dateInput, setDateInput] = useState(""); // chỉ cần ngày

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentRes, violationRes, studentViolationRes] = await Promise.all([
          api.get(`/api/students/${studentId}`),
          api.get("/api/violations"),
          api.get(`/api/student-violations/${studentId}`),
        ]);
        setStudent(studentRes.data);
        setAllViolations(violationRes.data);
        setViolations(studentViolationRes.data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
      }
    };

    fetchData();
  }, [studentId]);

  const handleAddViolation = async () => {
    if (!selectedViolation) return;

    try {
      let violationTime: Date;
      if (dateInput) {
        violationTime = new Date(dateInput); // chỉ lấy ngày
      } else {
        violationTime = new Date(); // nếu để trống thì lấy hệ thống
      }

      const res = await api.post("/api/student-violations", {
        studentId,
        violationId: selectedViolation,
        time: violationTime.toISOString(),
      });

      setViolations([...violations, res.data]);
      setSelectedViolation("");
      setDateInput("");
    } catch (error) {
      console.error("Lỗi khi thêm vi phạm:", error);
    }
  };

  const handleDeleteViolation = async (id: string) => {
    try {
      await api.delete(`/api/student-violations/${id}`);
      setViolations(violations.filter((v) => v._id !== id));
    } catch (error) {
      console.error("Lỗi khi xóa vi phạm:", error);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" mb={2}>
        Chi tiết vi phạm
      </Typography>

      {student && (
        <Box mb={2}>
          <Typography>
            Học sinh: {student.name} - Lớp: {student.className}
          </Typography>
          <Typography>Điểm hạnh kiểm: {student.conductScore}</Typography>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label="Lỗi vi phạm"
            value={selectedViolation}
            onChange={(e) => setSelectedViolation(e.target.value)}
            sx={{ minWidth: 250 }}
          >
            {allViolations.map((v) => (
              <MenuItem key={v._id} value={v._id}>
                {v.violationName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            label="Ngày vi phạm"
            InputLabelProps={{ shrink: true }}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />

          <Button
            variant="contained"
            onClick={handleAddViolation}
          >
            Ghi nhận
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#90caf9" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v, index) => (
              <TableRow key={v._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{v.violation?.violationName}</TableCell>
                <TableCell>
                  {new Date(v.time).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell>{v.handlingMethod}</TableCell>
                <TableCell>
                  {v.status === "Chưa xử lý" ? (
                    <Typography color="error">Chưa xử lý</Typography>
                  ) : (
                    "Đã xử lý"
                  )}
                </TableCell>
                <TableCell>{v.points}</TableCell>
                <TableCell>{v.week}</TableCell>
                <TableCell>
                  <Button
                    color="error"
                    onClick={() => handleDeleteViolation(v._id)}
                  >
                    Xoá
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
        Quay lại
      </Button>
    </Box>
  );
};

export default ViolationDetailPage;
