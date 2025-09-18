import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Button,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface Score {
  className: string;
  grade: string;
  weekNumber: number;
  attendanceScore: number;
  hygieneScore: number;
  lineupScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

interface Setting {
  disciplineMax: number;
  classCounts?: Record<string, number>; // ví dụ { "10": 5, "11": 6 }
}

export default function WeeklyScoresPage() {
  const [week, setWeek] = useState<number>(1);
  const [scores, setScores] = useState<Score[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);

  // load settings
  useEffect(() => {
    api.get("/api/settings").then((res) => {
      setSettings(res.data);
    });
  }, []);

  // load dữ liệu điểm tuần
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/class-weekly-scores/temp", {
          params: { weekNumber: week },
        });
        let data: Score[] = res.data;

        // Nếu có settings.classCounts -> thêm các lớp trống
        if (settings?.classCounts) {
          const filled: Score[] = [...data];
          for (const [grade, count] of Object.entries(settings.classCounts)) {
            for (let i = 1; i <= count; i++) {
              const className = `${grade}${i}`;
              if (!filled.find((s) => s.className === className)) {
                filled.push({
                  className,
                  grade,
                  weekNumber: week,
                  attendanceScore: 0,
                  hygieneScore: 0,
                  lineupScore: 0,
                  violationScore: 0,
                  academicScore: 0,
                  bonusScore: 0,
                  totalViolation: settings.disciplineMax ?? 100,
                  totalScore: 0,
                  ranking: 0,
                });
              }
            }
          }
          data = filled;
        }

        // sắp xếp theo grade + ranking
        data.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
          return a.ranking - b.ranking;
        });

        setScores(data);
      } catch (err) {
        console.error("Lỗi load dữ liệu:", err);
      }
    };
    fetchData();
  }, [week, settings]);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần {week}
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          size="small"
        >
          {[...Array(10)].map((_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              Tuần {i + 1}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          onClick={() => console.log("Lưu điểm tuần:", scores)}
        >
          Lưu
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm Chuyên cần</TableCell>
              <TableCell>Điểm Vệ sinh</TableCell>
              <TableCell>Điểm Xếp hàng</TableCell>
              <TableCell>Điểm Vi phạm</TableCell>
              <TableCell>Điểm Học tập</TableCell>
              <TableCell>Điểm Thưởng</TableCell>
              <TableCell>Tổng kỷ luật</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.lineupScore}</TableCell>
                <TableCell>{s.violationScore}</TableCell>
                <TableCell>{s.academicScore}</TableCell>
                <TableCell>{s.bonusScore}</TableCell>
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalScore}</TableCell>
                <TableCell>{s.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
