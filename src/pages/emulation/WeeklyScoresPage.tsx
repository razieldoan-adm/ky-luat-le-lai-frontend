import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface Score {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation?: number;
  totalScore?: number;
  rank?: number;
}

const WeeklyScoresPage = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<Score[]>([]);

  // Load dữ liệu khi đổi tuần
  useEffect(() => {
    fetchScores();
  }, [weekNumber]);

  const fetchScores = async () => {
    try {
      const res = await api.get(`/weekly-scores?weekNumber=${weekNumber}`);
      setScores(res.data);
    } catch (err) {
      alert("Không tải được dữ liệu.");
    }
  };

  const handleCalculate = async () => {
    try {
      await api.post("/weekly-scores/calculate", { weekNumber });
      await fetchScores();
    } catch (err) {
      alert("Không gom được dữ liệu. Kiểm tra backend.");
    }
  };

  const handleRank = async () => {
    try {
      await api.post("/weekly-scores/calculate-total-rank", { weekNumber });
      await fetchScores();
    } catch (err) {
      alert("Không tính được xếp hạng.");
    }
  };

  const handleSave = async () => {
    try {
      await api.post("/weekly-scores", { weekNumber, scores });
      alert("Đã lưu thành công!");
    } catch (err) {
      alert("Lưu thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Điểm Thi Đua Tuần
      </Typography>

      {/* Dropdown chọn tuần */}
      <FormControl sx={{ minWidth: 150, mb: 2 }}>
        <InputLabel>Chọn Tuần</InputLabel>
        <Select
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Buttons */}
      <Stack direction="row" spacing={2} mb={2}>
        <Button variant="contained" onClick={handleCalculate}>
          GOM DỮ LIỆU
        </Button>
        <Button variant="outlined" onClick={handleRank}>
          TÍNH XẾP HẠNG
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          LƯU
        </Button>
      </Stack>

      {/* Table hiển thị kết quả */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>SĐB</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.grade}</TableCell>
                <TableCell>{s.academicScore}</TableCell>
                <TableCell>{s.disciplineScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.lineUpScore}</TableCell>
                <TableCell>{s.totalScore ?? "-"}</TableCell>
                <TableCell>{s.rank ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default WeeklyScoresPage;
