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
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

const WeeklyScoresPage = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Lấy disciplineMax từ settings
  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data && res.data.disciplineMax) {
        setDisciplineMax(res.data.disciplineMax);
      }
    } catch (err) {
      console.error("Lỗi load settings:", err);
    }
  };

  // Load dữ liệu thô
  const fetchRawData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/class-weekly-scores/temp?weekNumber=${weekNumber}`);
      let rawData: WeeklyScore[] = res.data;

      // Nếu chưa có thì trả về mảng rỗng
      if (!Array.isArray(rawData)) rawData = [];

      // Tính toán trước khi hiển thị
      const calculated = rawData.map((item) => {
        const totalViolation =
          (disciplineMax || 0) -
          ((item.violationScore || 0) +
            (item.hygieneScore || 0) +
            (item.attendanceScore || 0) +
            (item.lineUpScore || 0));

        const totalScore = (item.academicScore || 0) + (item.bonusScore || 0) + totalViolation;

        return { ...item, totalViolation, totalScore };
      });

      // Xếp hạng trong từng khối
      const grouped: Record<string, WeeklyScore[]> = {};
      calculated.forEach((s) => {
        if (!grouped[s.grade]) grouped[s.grade] = [];
        grouped[s.grade].push(s);
      });

      Object.values(grouped).forEach((arr) => {
        arr.sort((a, b) => b.totalScore - a.totalScore);
        arr.forEach((s, idx) => (s.rank = idx + 1));
      });

      setScores([...calculated]);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
      setAlert({ open: true, message: "Lỗi load dữ liệu", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Lưu dữ liệu
  const saveData = async () => {
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber,
        scores,
      });
      setAlert({ open: true, message: "Lưu thành công!", severity: "success" });
    } catch (err) {
      console.error("Lỗi lưu:", err);
      setAlert({ open: true, message: "Lỗi khi lưu dữ liệu", severity: "error" });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (disciplineMax > 0) {
      fetchRawData();
    }
  }, [weekNumber, disciplineMax]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý Điểm Thi Đua Tuần
      </Typography>

      {/* Chọn tuần */}
      <TextField
        select
        label="Chọn tuần"
        value={weekNumber}
        onChange={(e) => setWeekNumber(Number(e.target.value))}
        sx={{ mb: 2, width: 200 }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <MenuItem key={i + 1} value={i + 1}>
            Tuần {i + 1}
          </MenuItem>
        ))}
      </TextField>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Vi phạm</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = [...scores];
                      updated[idx].academicScore = val;
                      updated[idx].totalScore = val + updated[idx].bonusScore + updated[idx].totalViolation;
                      setScores(updated);
                    }}
                    size="small"
                  />
                </TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.lineUpScore}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = [...scores];
                      updated[idx].bonusScore = val;
                      updated[idx].totalScore = updated[idx].academicScore + val + updated[idx].totalViolation;
                      setScores(updated);
                    }}
                    size="small"
                  />
                </TableCell>
                <TableCell>{row.totalViolation}</TableCell>
                <TableCell>{row.totalScore}</TableCell>
                <TableCell>{row.rank}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Button variant="contained" color="primary" onClick={saveData} sx={{ mt: 2 }}>
        Lưu kết quả
      </Button>

      <Snackbar open={alert.open} autoHideDuration={3000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklyScoresPage;
