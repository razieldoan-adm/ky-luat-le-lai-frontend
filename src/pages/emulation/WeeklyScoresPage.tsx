import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import api from "../../api/api";
import dayjs from "dayjs";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassResult {
  className: string;
  studyScore: number; // điểm học tập
  bonusScore: number; // điểm thưởng
  discipline: number; // kỷ luật
  hygiene: number; // vệ sinh
  diligence: number; // chuyên cần
  totalBehavior: number; // tổng nề nếp
  total: number; // tổng điểm
  rankBehavior?: number;
  rankTotal?: number;
}

export default function FinalCompetitionResultPage() {
  const [weekList, setWeekList] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<ClassResult[]>([]);

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchResults = async (weekId: string) => {
    try {
      // TODO: gọi API backend trả về kết quả tính sẵn theo tuần
      const res = await api.get(`/api/final-competition/week/${weekId}`);
      const data: ClassResult[] = res.data;

      // Tính xếp hạng nề nếp
      const behaviorSorted = [...data].sort((a, b) => b.totalBehavior - a.totalBehavior);
      behaviorSorted.forEach((item, index) => {
        item.rankBehavior = index + 1;
      });

      // Tính xếp hạng toàn trường
      const totalSorted = [...data].sort((a, b) => b.total - a.total);
      totalSorted.forEach((item, index) => {
        item.rankTotal = index + 1;
      });

      setResults(data);
    } catch (err) {
      console.error("Lỗi khi lấy kết quả:", err);
    }
  };

  const handleWeekChange = (weekId: string) => {
    const week = weekList.find(w => w._id === weekId) || null;
    setSelectedWeek(week);
    if (week) fetchResults(week._id);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        🏆 Kết quả thi đua toàn trường theo tuần
      </Typography>

      <FormControl sx={{ minWidth: 200, mb: 2 }}>
        <InputLabel id="week-select-label">Tuần</InputLabel>
        <Select
          labelId="week-select-label"
          value={selectedWeek?._id || ""}
          onChange={e => handleWeekChange(e.target.value)}
        >
          {weekList.map(week => (
            <MenuItem key={week._id} value={week._id}>
              Tuần {week.weekNumber} ({dayjs(week.startDate).format("DD/MM")} - {dayjs(week.endDate).format("DD/MM")})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="body1" gutterBottom>
        Tổng số lớp: {results.length}
      </Typography>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hạng nề nếp</TableCell>
              <TableCell>Tổng điểm nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((row, index) => (
              <TableRow key={row.className}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.studyScore}</TableCell>
                <TableCell>{row.bonusScore}</TableCell>
                <TableCell>{row.discipline}</TableCell>
                <TableCell>{row.hygiene}</TableCell>
                <TableCell>{row.diligence}</TableCell>
                <TableCell>{row.rankBehavior}</TableCell>
                <TableCell>{row.totalBehavior}</TableCell>
                <TableCell>{row.total}</TableCell>
                <TableCell>{row.rankTotal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
