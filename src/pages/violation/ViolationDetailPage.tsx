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

// ======= HÀM HỖ TRỢ =======
// Parse datetime-local chỉ lấy dd/MM, năm = năm hệ thống
function parseCustomDate(value: string): Date | null {
  if (!value) return null;
  const [, monthStr, dayStr] = value.split("-");
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, Number(monthStr) - 1, Number(dayStr));
}


// Format hiển thị dd/MM/yyyy
function formatDate(dateString: string) {
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ViolationDetailPage() {
  const { studentId, className } = useParams();
  const navigate = useNavigate();

  const [violations, setViolations] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState("");
  const [customTime, setCustomTime] = useState<string>("");

  // tải dữ liệu
  useEffect(() => {
    const fetchData = async () => {
      const res1 = await api.get(`/api/violations/student/${studentId}`);
      setViolations(res1.data);

      const res2 = await api.get("/api/rules");
      setRules(res2.data);
    };
    fetchData();
  }, [studentId]);

  // Ghi nhận vi phạm
  const handleAddViolation = async () => {
    if (!selectedRule) return;

    const chosenTime = parseCustomDate(customTime);

    await api.post("/api/violations", {
      studentId,
      className,
      description: selectedRule,
      time: chosenTime ? chosenTime : new Date(), // nếu có chọn thì lấy ngày/tháng, năm = hệ thống
      handled: false,
    });

    // refresh lại list
    const res = await api.get(`/api/violations/student/${studentId}`);
    setViolations(res.data);

    // reset input
    setSelectedRule("");
    setCustomTime("");
  };

  // Xử lý vi phạm
  const handleProcess = async (id: string) => {
    await api.put(`/api/violations/${id}/handle`);
    const res = await api.get(`/api/violations/student/${studentId}`);
    setViolations(res.data);
  };

  // Xóa vi phạm
  const handleDelete = async (id: string) => {
    await api.delete(`/api/violations/${id}`);
    const res = await api.get(`/api/violations/student/${studentId}`);
    setViolations(res.data);
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Chi tiết vi phạm
      </Typography>

      {/* Form ghi nhận */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2} direction="row">
          <TextField
            select
            label="Lỗi vi phạm"
            value={selectedRule}
            onChange={(e) => setSelectedRule(e.target.value)}
            fullWidth
          >
            {rules.map((rule) => (
              <MenuItem key={rule._id} value={rule.title}>
                {rule.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Thời gian vi phạm"
            type="date"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddViolation}
          >
            GHI NHẬN
          </Button>
        </Stack>
      </Paper>

      {/* Danh sách vi phạm */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v, idx) => (
              <TableRow key={v._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{v.description}</TableCell>
                <TableCell>{formatDate(v.time)}</TableCell>
                <TableCell>
                  {v.handled ? (
                    <Typography color="green">Đã xử lý</Typography>
                  ) : (
                    <Typography color="red">Chưa xử lý</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {!v.handled && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleProcess(v._id)}
                      sx={{ mr: 1 }}
                    >
                      XỬ LÝ
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDelete(v._id)}
                  >
                    XOÁ
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box mt={2}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          QUAY LẠI
        </Button>
      </Box>
    </Box>
  );
}
