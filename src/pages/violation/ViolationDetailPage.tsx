import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

interface Violation {
  _id: string;
  description: string;
  time?: string;
  handled: boolean;
  handlingMethod: string;
  handledBy?: string;
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

const ViolationDetailPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const className = new URLSearchParams(location.search).get("className") || "";

  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [maxConductScore, setMaxConductScore] = useState(100);
  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");

  // 🔧 Dialog chỉnh sửa lỗi
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Violation | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    fetchViolations();
    fetchRules();
    fetchSettings();
  }, [name, className]);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.maxConductScore) {
        setMaxConductScore(res.data.maxConductScore);
      }
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get(
        `/api/violations/${encodeURIComponent(name || "")}?className=${encodeURIComponent(className)}`
      );
      setViolations(res.data || []);
    } catch (err) {
      console.error("Error fetching violations:", err);
      setViolations([]);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get("/api/rules");
      setRules(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy rules:", err);
    }
  };

  const getViolationDate = (): Date => {
    const now = new Date();
    const year = now.getFullYear();
    if (dayInput && monthInput) {
      const dd = parseInt(dayInput, 10);
      const mm = parseInt(monthInput, 10) - 1;
      if (!isNaN(dd) && !isNaN(mm) && dd > 0 && dd <= 31 && mm >= 0 && mm < 12) {
        const customDate = new Date(year, mm, dd, 12, 0, 0, 0);
        if (!isNaN(customDate.getTime())) return customDate;
      }
    }
    return new Date();
  };

  const renderTime = (time?: string) => {
    if (!time) return "N/A";
    const parsed = new Date(time);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString("vi-VN");
    return time;
  };

  // ➕ Ghi nhận lỗi mới
  const handleAddViolation = async () => {
    const selectedRule = rules.find((r) => r._id === selectedRuleId);
    if (!selectedRule || !name || !className) {
      setSnackbarMessage("Vui lòng chọn lỗi vi phạm và đảm bảo có tên/lớp.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      const weeksRes = await api.get("/api/academic-weeks/study-weeks");
      const weeks = weeksRes.data || [];
      const now = new Date();
      const currentWeekFound = weeks.find((w: any) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return now >= start && now <= end;
      });
      const weekNumber = currentWeekFound ? currentWeekFound.weekNumber : null;

      const violationDate = getViolationDate();

      await api.post("/api/violations", {
        name,
        className,
        description: selectedRule.title,
        handlingMethod: "",
        weekNumber,
        time: violationDate.toISOString(),
        handled: false,
        handledBy: "",
      });

      setSelectedRuleId("");
      setDayInput("");
      setMonthInput("");
      setSnackbarMessage(`Đã ghi nhận lỗi: ${selectedRule.title}`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi ghi nhận vi phạm:", err);
      setSnackbarMessage("Lỗi khi ghi nhận vi phạm.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // ❌ Xoá vi phạm
  const handleDeleteViolation = async (id: string) => {
    try {
      await api.delete(`/api/violations/${id}`);
      setViolations((prev) => prev.filter((v) => v._id !== id));
      setSnackbarMessage("Xoá vi phạm thành công!");
      setSnackbarSeverity("success");
    } catch (err) {
      console.error("Lỗi xoá vi phạm:", err);
      setSnackbarMessage("Lỗi xoá vi phạm.");
      setSnackbarSeverity("error");
    } finally {
      setSnackbarOpen(true);
    }
  };

  // ✏️ Mở dialog sửa
  const openEditDialog = (v: Violation) => {
    setEditItem(v);
    setEditDescription(v.description);
    setEditDate(renderTime(v.time));
    setEditDialogOpen(true);
  };

  // 💾 Lưu sửa
  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
     
      const formattedDate = dayjs(editDate, "DD/MM/YYYY").isValid()
        ? dayjs(editDate, "DD/MM/YYYY").toDate()
        : new Date();

      await api.put(`/api/violations/${editItem._id}`, {
        description: editDescription,
        time: formattedDate,
      });

      setSnackbarMessage("Đã cập nhật lỗi vi phạm!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setEditDialogOpen(false);
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi cập nhật vi phạm:", err);
      setSnackbarMessage("Không thể cập nhật vi phạm.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

const totalPenalty = violations.reduce(
  (sum, v) => sum + ((rules.find((r) => r.title === v.description)?.point) || 0),
  0
);


  const finalScore = Math.max(maxConductScore - totalPenalty, 0);
  const isBelowThreshold = finalScore < maxConductScore * 0.5;

  return (
    <Box sx={{ width: "80vw", py: 6, mx: "auto" }}>
      <Typography variant="h4" fontWeight="bold" align="center">
        Chi tiết vi phạm
      </Typography>
      <Typography variant="h6">
        Học sinh: {name} - Lớp: {className}
      </Typography>
      <Typography color={isBelowThreshold ? "error" : "green"}>
        Điểm hạnh kiểm: {finalScore}/{maxConductScore}
      </Typography>

      {/* Form thêm lỗi */}
      <Card sx={{ my: 3 }}>
        <CardContent>
          <Typography variant="h6">Ghi nhận lỗi mới</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Lỗi vi phạm</InputLabel>
              <Select value={selectedRuleId} label="Lỗi vi phạm" onChange={(e) => setSelectedRuleId(e.target.value)}>
                {rules.map((rule) => (
                  <MenuItem key={rule._id} value={rule._id}>
                    {rule.title} ({rule.point} điểm)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Ngày (dd)"
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value.replace(/\D/g, ""))}
              inputProps={{ maxLength: 2 }}
              sx={{ width: 100 }}
            />
            <TextField
              label="Tháng (MM)"
              value={monthInput}
              onChange={(e) => setMonthInput(e.target.value.replace(/\D/g, ""))}
              inputProps={{ maxLength: 2 }}
              sx={{ width: 100 }}
            />

            <Button variant="contained" onClick={handleAddViolation}>
              Ghi nhận
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Bảng hiển thị */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#87cafe" }}>
              <TableCell>STT</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{renderTime(v.time)}</TableCell>
                  <TableCell>
                    <Select size="small" value={v.handlingMethod} disabled>
                      <MenuItem value="Nhắc nhở">Nhắc nhở</MenuItem>
                      <MenuItem value="Kiểm điểm">Kiểm điểm</MenuItem>
                      <MenuItem value="Chép phạt">Chép phạt</MenuItem>
                      <MenuItem value="Báo phụ huynh">Báo phụ huynh</MenuItem>
                      <MenuItem value="Mời phụ huynh">Mời phụ huynh</MenuItem>
                      <MenuItem value="Tạm dừng việc học tập">Tạm dừng việc học tập</MenuItem>
                      <MenuItem value="Xét hạ hạnh kiểm">Xét hạ hạnh kiểm</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {v.handled ? (
                      <Box sx={{ backgroundColor: "green", color: "white", px: 1, py: 0.5, borderRadius: 1, textAlign: "center" }}>
                        Đã xử lý
                      </Box>
                    ) : (
                      <Box sx={{ backgroundColor: "#ffcccc", color: "red", px: 1, py: 0.5, borderRadius: 1, textAlign: "center" }}>
                        Chưa xử lý
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{v.weekNumber ?? "N/A"}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEditDialog(v)}>
                      Sửa
                    </Button>
                    <Button size="small" color="error" onClick={() => handleDeleteViolation(v._id)}>
                      Xoá
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog sửa lỗi */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Sửa lỗi vi phạm</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Lỗi vi phạm</InputLabel>
            <Select value={editDescription} label="Lỗi vi phạm" onChange={(e) => setEditDescription(e.target.value)}>
              {rules.map((rule) => (
                <MenuItem key={rule._id} value={rule.title}>
                  {rule.title} ({rule.point} điểm)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Ngày vi phạm (dd/mm/yyyy)"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Button variant="outlined" sx={{ mt: 3 }} onClick={() => navigate("/violation/")}>
        Quay lại
      </Button>
    </Box>
  );
};

export default ViolationDetailPage;
