import {  useState } from "react";
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
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineupScore: number;
  totalViolation: number;
  totalScore: number;
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Hàm tải dữ liệu thô từ API temp
  const loadTempScores = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/class-weekly-scores/temp`, {
        params: { weekNumber },
      });
      setScores(res.data || []);
    } catch (err: any) {
      console.error("Lỗi load dữ liệu:", err);
      setMessage("Không thể tải dữ liệu thô");
    } finally {
      setLoading(false);
    }
  };

  // Hàm lưu dữ liệu vào DB
  const saveScores = async () => {
    try {
      setSaving(true);
      await api.post("/api/class-weekly-scores", { weekNumber, scores });
      setMessage("Lưu thành công!");
    } catch (err: any) {
      console.error("Lỗi lưu dữ liệu:", err);
      setMessage("Lưu thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // Cập nhật điểm nhập vào
  const handleChange = (index: number, field: keyof WeeklyScore, value: number) => {
    const newScores = [...scores];
    (newScores[index] as any)[field] = value;

    // Tính lại totalScore
    newScores[index].totalScore =
      newScores[index].academicScore +
      newScores[index].bonusScore +
      newScores[index].totalViolation;

    setScores(newScores);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      {/* Chọn tuần */}
      <TextField
        select
        label="Chọn tuần"
        value={weekNumber}
        onChange={(e) => setWeekNumber(Number(e.target.value))}
        sx={{ mb: 2, minWidth: 150 }}
      >
        {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
          <MenuItem key={w} value={w}>
            Tuần {w}
          </MenuItem>
        ))}
      </TextField>

      {/* Nút load dữ liệu */}
      <Button
        variant="contained"
        onClick={loadTempScores}
        sx={{ ml: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : "Tải dữ liệu thô"}
      </Button>

      {/* Bảng dữ liệu */}
      <Paper sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Vi phạm</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Điểm nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) =>
                      handleChange(i, "academicScore", Number(e.target.value))
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={(e) =>
                      handleChange(i, "bonusScore", Number(e.target.value))
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.lineupScore}</TableCell>
                <TableCell>{row.totalViolation}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Nút lưu */}
      <Button
        variant="contained"
        color="success"
        onClick={saveScores}
        sx={{ mt: 2 }}
        disabled={saving || scores.length === 0}
      >
        {saving ? <CircularProgress size={20} color="inherit" /> : "Lưu kết quả"}
      </Button>

      {/* Thông báo */}
      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage("")}
      >
        <Alert severity="info" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
