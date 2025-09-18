import { useEffect, useState } from "react";
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import api from "../../api/api";

interface ClassInfo {
  _id: string;
  name: string;
  grade: number;
  homeroomTeacher: string;
}

interface ScoreData {
  classId: string;
  totalScore: number;
  totalViolations: number;
}

interface Setting {
  weeks: number[];
  classes: ClassInfo[];
}

export default function WeeklyScoresPage() {
  const [settings, setSettings] = useState<Setting | null>(null);
  const [week, setWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ScoreData[]>([]);

  // Lấy settings (gồm danh sách lớp + tuần)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings(res.data);
      } catch (error) {
        console.error("Lỗi tải settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleLoad = async () => {
    if (!week) return;
    try {
      const res = await api.get("/api/class-lineup-summaries", {
        params: { weekNumber: week },
      });
      setScores(res.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
  };

  const getScoreByClass = (classId: string) => {
    const found = scores.find((s) => s.classId === classId);
    return found || { totalScore: 0, totalViolations: 0 };
  };

  // Tìm lớp đứng đầu mỗi khối
  const getTopClassesByGrade = () => {
    if (!settings) return {};
    const topByGrade: Record<number, string> = {};
    settings.classes
      .filter((cls) => cls.homeroomTeacher)
      .forEach((cls) => {
        const score = getScoreByClass(cls._id).totalScore;
        if (
          !topByGrade[cls.grade] ||
          score > getScoreByClass(topByGrade[cls.grade]).totalScore
        ) {
          topByGrade[cls.grade] = cls._id;
        }
      });
    return topByGrade;
  };

  if (!settings) return <Typography>Đang tải...</Typography>;

  const topClasses = getTopClassesByGrade();

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Tổng điểm vi phạm các lớp theo tuần
      </Typography>

      <FormControl sx={{ minWidth: 150, mr: 2 }}>
        <InputLabel>Tuần</InputLabel>
        <Select
          value={week}
          label="Tuần"
          onChange={(e) => setWeek(Number(e.target.value))}
        >
          {settings.weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleLoad}>
        LOAD DỮ LIỆU
      </Button>

      {week && (
        <Paper sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>STT</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Khối</TableCell>
                <TableCell align="center">Tổng điểm vi phạm</TableCell>
                <TableCell align="center">Tổng số lỗi vi phạm</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings.classes
                .filter((cls) => cls.homeroomTeacher) // chỉ lớp có GVCN
                .sort(
                  (a, b) =>
                    a.grade - b.grade || a.name.localeCompare(b.name)
                )
                .map((cls, idx) => {
                  const score = getScoreByClass(cls._id);
                  const isTop = topClasses[cls.grade] === cls._id;
                  return (
                    <TableRow
                      key={cls._id}
                      sx={{
                        backgroundColor: isTop ? "#e0ffe0" : "inherit", // highlight lớp top
                        fontWeight: isTop ? "bold" : "normal",
                      }}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>{cls.grade}</TableCell>
                      <TableCell align="center">{score.totalScore}</TableCell>
                      <TableCell align="center">
                        {score.totalViolations}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
