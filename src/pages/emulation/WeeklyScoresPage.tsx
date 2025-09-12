import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
} from "@mui/material";
import axios from "axios";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassScore {
  _id: string;
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  totalScore: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(false);

  // Gọi API lấy danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await axios.get<Week[]>("/api/academic-weeks/study-weeks");
        setWeeks(res.data);
        if (res.data.length > 0) {
          setSelectedWeek(res.data[0].weekNumber); // mặc định chọn tuần đầu tiên
        }
      } catch (err) {
        console.error("Lỗi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Khi đổi tuần → gọi API lấy điểm
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await axios.get<ClassScore[]>(
          `/api/class-violation-scores/week/${selectedWeek}`
        );
        setScores(res.data);
      } catch (err) {
        console.error("Lỗi tải điểm:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [selectedWeek]);

  // Gom nhóm theo khối
  const groupedScores = scores.reduce<Record<string, ClassScore[]>>((acc, item) => {
    if (!acc[item.grade]) acc[item.grade] = [];
    acc[item.grade].push(item);
    return acc;
  }, {});

  // Xác định lớp đứng đầu mỗi khối
  const topClassByGrade: Record<string, string> = {};
  Object.keys(groupedScores).forEach((grade) => {
    const sorted = [...groupedScores[grade]].sort(
      (a, b) => b.totalScore - a.totalScore
    );
    if (sorted.length > 0) {
      topClassByGrade[grade] = sorted[0].className;
    }
  });

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Bảng điểm tuần
      </Typography>

      {/* Dropdown chọn tuần */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="week-select-label">Chọn tuần</InputLabel>
        <Select
          labelId="week-select-label"
          value={selectedWeek}
          label="Chọn tuần"
          onChange={(e) => setSelectedWeek(e.target.value as number)}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} -{" "}
              {new Date(w.endDate).toLocaleDateString()})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <Typography>Đang tải dữ liệu...</Typography>
      ) : (
        Object.keys(groupedScores).map((grade) => (
          <Box key={grade} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Khối {grade}
            </Typography>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell align="right">Điểm học tập</TableCell>
                    <TableCell align="right">Điểm thưởng</TableCell>
                    <TableCell align="right">Điểm kỷ luật</TableCell>
                    <TableCell align="right">Tổng điểm</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedScores[grade].map((row) => (
                    <TableRow
                      key={row._id}
                      sx={{
                        backgroundColor:
                          row.className === topClassByGrade[grade]
                            ? "rgba(255, 223, 186, 0.5)"
                            : "inherit",
                      }}
                    >
                      <TableCell>{row.className}</TableCell>
                      <TableCell align="right">{row.academicScore}</TableCell>
                      <TableCell align="right">{row.bonusScore}</TableCell>
                      <TableCell align="right">{row.violationScore}</TableCell>
                      <TableCell align="right">{row.totalScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ))
      )}
    </Container>
  );
};

export default WeeklyScoresPage;
