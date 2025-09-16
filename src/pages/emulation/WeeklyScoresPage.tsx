import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface StudyWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface RawScore {
  className: string;
  grade: string;
  weekNumber: number;
  score: number;
}

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalRankScore: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<StudyWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const [attendance, setAttendance] = useState<RawScore[]>([]);
  const [hygiene, setHygiene] = useState<RawScore[]>([]);
  const [lineup, setLineup] = useState<RawScore[]>([]);
  const [violations, setViolations] = useState<RawScore[]>([]);

  const [manualScores, setManualScores] = useState<Record<string, Partial<WeeklyScore>>>({});

  // Lấy danh sách tuần từ API settings
  useEffect(() => {
    const fetchWeeks = async () => {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
    };
    fetchWeeks();
  }, []);

  // Lấy dữ liệu điểm từ 4 bảng gốc
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedWeek) return;

      const [att, hy, line, viol] = await Promise.all([
        api.get(`/api/class-attendance-summaries?weekNumber=${selectedWeek}`),
        api.get(`/api/class-hygiene-scores?weekNumber=${selectedWeek}`),
        api.get(`/api/class-lineup-summaries?weekNumber=${selectedWeek}`),
        api.get(`/api/class-violation-scores?weekNumber=${selectedWeek}`),
      ]);

      setAttendance(att.data);
      setHygiene(hy.data);
      setLineup(line.data);
      setViolations(viol.data);
    };

    fetchData();
  }, [selectedWeek]);

  // Gom dữ liệu từ 4 API
  const mergedScores: WeeklyScore[] = useMemo(() => {
    const map: Record<string, WeeklyScore> = {};

    const addData = (arr: RawScore[], key: keyof WeeklyScore) => {
      arr.forEach((item) => {
        if (!map[item.className]) {
          map[item.className] = {
            className: item.className,
            grade: item.grade,
            weekNumber: selectedWeek,
            academicScore: 0,
            bonusScore: 0,
            disciplineScore: 0,
            hygieneScore: 0,
            attendanceScore: 0,
            lineUpScore: 0,
            totalViolation: 0,
            totalRankScore: 0,
          };
        }
        map[item.className][key] = item.score ?? 0;
      });
    };

    addData(attendance, "attendanceScore");
    addData(hygiene, "hygieneScore");
    addData(lineup, "lineUpScore");
    addData(violations, "disciplineScore");

    return Object.values(map);
  }, [attendance, hygiene, lineup, violations, selectedWeek]);

  // Tính toán trên FE
  const calculatedScores = useMemo(() => {
    return mergedScores.map((s) => {
      const manual = manualScores[s.className] || {};
      const academicScore = manual.academicScore ?? s.academicScore;
      const bonusScore = manual.bonusScore ?? s.bonusScore;

      const totalViolation =
        s.disciplineScore + s.hygieneScore + s.attendanceScore + s.lineUpScore;

      const totalRankScore = academicScore + bonusScore + (100 - totalViolation); // 100 = maxDisciplineScore

      return {
        ...s,
        academicScore,
        bonusScore,
        totalViolation,
        totalRankScore,
      };
    });
  }, [mergedScores, manualScores]);

  // Nhập điểm trực tiếp
  const handleScoreChange = (
    className: string,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    setManualScores((prev) => ({
      ...prev,
      [className]: {
        ...prev[className],
        [field]: value,
      },
    }));
  };

  // Lưu dữ liệu tổng hợp
  const handleSave = async () => {
    await api.post("/api/weekly-scores", {
      weekNumber: selectedWeek,
      scores: calculatedScores,
    });
    alert("Đã lưu thành công!");
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      {/* Chọn tuần */}
      <Box mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          SelectProps={{ native: true }}
        >
          {weeks.map((w) => (
            <option key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
            </option>
          ))}
        </TextField>
      </Box>

      {/* Bảng dữ liệu */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {calculatedScores.map((row) => (
              <TableRow key={row.className}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={(e) =>
                      handleScoreChange(
                        row.className,
                        "academicScore",
                        Number(e.target.value)
                      )
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={(e) =>
                      handleScoreChange(
                        row.className,
                        "bonusScore",
                        Number(e.target.value)
                      )
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{row.disciplineScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.lineUpScore}</TableCell>
                <TableCell>{row.totalViolation}</TableCell>
                <TableCell>{row.totalRankScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Box mt={2}>
        <Button variant="contained" onClick={handleSave}>
          Lưu kết quả
        </Button>
      </Box>
    </Box>
  );
}
