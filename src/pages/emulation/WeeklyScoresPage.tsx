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
  CircularProgress,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  grade: string;
  attendanceScore: number;
  hygieneScore: number;
  lineupScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  rank: number;
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Lấy disciplineMax từ settings
  useEffect(() => {
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
    fetchSettings();
  }, []);

  // Load dữ liệu thô theo tuần
  useEffect(() => {
    if (!weekNumber) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/api/class-weekly-scores/temp?weekNumber=${weekNumber}`
        );
        const raw: WeeklyScore[] = res.data.map((s: any) => ({
          ...s,
          academicScore: s.academicScore || 0,
          bonusScore: s.bonusScore || 0,
          totalViolation: 0,
          totalScore: 0,
          rank: 0,
        }));
        setScores(calculateScores(raw));
      } catch (err) {
        console.error("Lỗi load dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weekNumber, disciplineMax]);

  // Hàm tính toán điểm + xếp hạng
  const calculateScores = (data: WeeklyScore[]) => {
    const calculated = data.map((s) => {
      const totalViolation =
        disciplineMax -
        (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineupScore);

      const totalScore = totalViolation + s.academicScore + s.bonusScore;

      return { ...s, totalViolation, totalScore };
    });

    // Gom theo khối để xếp hạng
    const grouped: { [key: string]: WeeklyScore[] } = {};
    calculated.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    Object.values(grouped).forEach((list) => {
      list.sort((a, b) => b.totalScore - a.totalScore);
      list.forEach((s, i) => (s.rank = i + 1));
    });

    return calculated;
  };

  // Xử lý nhập điểm học tập / thưởng
  const handleInputChange = (
    index: number,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    const newScores = [...scores];
    (newScores[index] as any)[field] = value;
    setScores(calculateScores(newScores));
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    try {
      await api.post("/api/class-weekly-scores", {
        weekNumber,
        scores,
      });
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Lỗi lưu dữ liệu:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua - Tuần
      </Typography>

      {/* Dropdown chọn tuần */}
      <TextField
        select
        label="Chọn tuần"
        value={weekNumber}
        onChange={(e) => setWeekNumber(Number(e.target.value))}
        sx={{ mb: 2, width: 200 }}
      >
        {[...Array(20)].map((_, i) => (
          <MenuItem key={i + 1} value={i + 1}>
            Tuần {i + 1}
          </MenuItem>
        ))}
      </TextField>

      {/* Hiển thị loading */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Khối</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Kỷ luật</TableCell>
                <TableCell>Điểm học tập</TableCell>
                <TableCell>Điểm thưởng</TableCell>
                <TableCell>Tổng nề nếp</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Thứ hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((s, index) => (
                <TableRow
                  key={s.className}
                  sx={{
                    backgroundColor:
                      s.rank === 1 ? "rgba(0,200,83,0.2)" : "inherit",
                  }}
                >
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell>{s.attendanceScore}</TableCell>
                  <TableCell>{s.hygieneScore}</TableCell>
                  <TableCell>{s.lineupScore}</TableCell>
                  <TableCell>{s.violationScore}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.academicScore}
                      onChange={(e) =>
                        handleInputChange(
                          index,
                          "academicScore",
                          Number(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={s.bonusScore}
                      onChange={(e) =>
                        handleInputChange(
                          index,
                          "bonusScore",
                          Number(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{s.totalViolation}</TableCell>
                  <TableCell>{s.totalScore}</TableCell>
                  <TableCell>{s.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Nút lưu */}
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleSave}
        disabled={loading}
      >
        Lưu kết quả
      </Button>

      {/* Thông báo lưu thành công */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity="success">Đã lưu thành công!</Alert>
      </Snackbar>
    </Box>
  );
}
