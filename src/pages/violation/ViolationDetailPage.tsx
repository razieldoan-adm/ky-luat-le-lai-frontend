import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";

interface Violation {
  _id: string;
  violationName: string;
  date: string;
  handlingMethod: string;
  status: string;
  points: number;
  week: number;
}

const ViolationDetailPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const className = searchParams.get("className") || "";

  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedViolation, setSelectedViolation] = useState("");
  const [violationList, setViolationList] = useState<any[]>([]);
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    fetchViolations();
    fetchViolationList();
  }, [studentId]);

  const fetchViolations = async () => {
    try {
      const res = await api.get(`/api/violations/student/${studentId}`);
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
    }
  };

  const fetchViolationList = async () => {
    try {
      const res = await api.get("/api/violations/list");
      setViolationList(res.data);
    } catch (err) {
      console.error("Lỗi khi tải danh mục vi phạm:", err);
    }
  };

  // Format ngày hiển thị dd/mm/yyyy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Thêm vi phạm mới
  const handleAddViolation = async () => {
    if (!selectedViolation) return;

    const now = new Date();
    const year = now.getFullYear();
    let violationDate: string;

    if (customDate) {
      // Nếu có chọn ngày (yyyy-mm-dd) → lấy dd/mm + năm hệ thống
      const [yyyy, mm, dd] = customDate.split("-");
      violationDate = new Date(`${year}-${mm}-${dd}`).toISOString();
    } else {
      // Nếu không chọn → lấy ngày giờ hệ thống
      violationDate = now.toISOString();
    }

    try {
      await api.post("/api/violations", {
        studentId,
        violationId: selectedViolation,
        date: violationDate,
      });
      setSelectedViolation("");
      setCustomDate("");
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi thêm vi phạm:", err);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    try {
      await api.delete(`/api/violations/${violationId}`);
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xóa vi phạm:", err);
    }
  };

  const handleProcessViolation = async (violationId: string) => {
    try {
      await api.put(`/api/violations/${violationId}/process`);
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xử lý vi phạm:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Chi tiết vi phạm
      </Typography>

      {/* Form ghi nhận lỗi mới */}
      <Box display="flex" gap={2} mb={3}>
        <Select
          value={selectedViolation}
          onChange={(e) => setSelectedViolation(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Lỗi vi phạm</MenuItem>
          {violationList.map((v) => (
            <MenuItem key={v._id} value={v._id}>
              {v.name}
            </MenuItem>
          ))}
        </Select>

        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          style={{ padding: "8px" }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleAddViolation}
        >
          Ghi nhận
        </Button>
      </Box>

      {/* Bảng danh sách vi phạm */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
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
                <TableCell>{v.violationName}</TableCell>
                <TableCell>{formatDate(v.date)}</TableCell>
                <TableCell>{v.handlingMethod}</TableCell>
                <TableCell>
                  {v.status === "unprocessed" ? "Chưa xử lý" : "Đã xử lý"}
                </TableCell>
                <TableCell>{v.points}</TableCell>
                <TableCell>{v.week}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleProcessViolation(v._id)}
                  >
                    Xử lý
                  </Button>
                  <Button
                    size="small"
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

      <Box mt={2}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </Box>
    </Box>
  );
};

export default ViolationDetailPage;
