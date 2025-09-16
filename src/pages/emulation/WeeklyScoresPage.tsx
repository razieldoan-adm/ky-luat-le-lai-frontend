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
  TextField,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface ScoreRecord {
  className: string;
  grade: string;
  weekNumber: number;

  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineupScore: number;

  academicScore: number; // nhập trực tiếp
  bonusScore: number; // nhập trực tiếp

  totalViolation: number;
  totalScore: number;
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [records, setRecords] = useState<ScoreRecord[]>([]);

  // API fetchers
  const fetchData = async () => {
    try {
      const [violations, hygiene, attendance, lineup] = await Promise.all([
        api.get(`/classviolationscores/by-week?weekNumber=${weekNumber}`),
        api.get(`/classhygienescores/by-week?weekNumber=${weekNumber}`),
        api.get(`/classattendancesummaries/by-week?weekNumber=${weekNumber}`),
        api.get(`/classlineupsummaries/by-week?weekNumber=${weekNumber}`),
      ]);

      // Gom dữ liệu
      const merged: ScoreRecord[] = [];
      const classMap: Record<string, ScoreRecord> = {};

      const allClasses = [
        ...violations.data,
        ...hygiene.data,
        ...attendance.data,
        ...lineup.data,
      ];

      allClasses.forEach((item: any) => {
        const key = `${item.className}-${item.weekNumber}`;
        if (!classMap[key]) {
          classMap[key] = {
            className: item.className,
            grade: item.grade || "",
            weekNumber: item.weekNumber,

            violationScore: 0,
            hygieneScore: 0,
            attendanceScore: 0,
            lineupScore: 0,

            academicScore: 0,
            bonusScore: 0,

            totalViolation: 0,
            totalScore: 0,
          };
        }

        if (item.violationScore !== undefined) {
          classMap[key].violationScore = item.violationScore;
        }
        if (item.hygieneScore !== undefined) {
          classMap[key].hygieneScore = item.hygieneScore;
        }
        if (item.attendanceScore !== undefined) {
          classMap[key].attendanceScore = item.attendanceScore;
        }
        if (item.lineupScore !== undefined) {
          classMap[key].lineupScore = item.lineupScore;
        }
      });

      Object.values(classMap).forEach((rec) => merged.push(rec));
      setRecords(merged);
    } catch (err) {
      console.error("Lỗi load dữ liệu:", err);
    }
  };

  const calculateScores = () => {
    const updated = records.map((rec) => {
      const totalViolation =
        rec.violationScore +
        rec.hygieneScore +
        rec.attendanceScore +
        rec.lineupScore;

      const totalScore = rec.academicScore + rec.bonusScore + totalViolation;

      return {
        ...rec,
        totalViolation,
        totalScore,
      };
    });

    setRecords(updated);
  };

  const saveScores = async () => {
    try {
      await api.post("/classweeklyscores/save", { weekNumber, records });
      alert("Lưu thành công!");
    } catch (err) {
      console.error("Lỗi lưu:", err);
      alert("Lỗi khi lưu dữ liệu");
    }
  };

  useEffect(() => {
    fetchData();
  }, [weekNumber]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Weekly Scores - Tuần {weekNumber}
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          type="number"
          label="Tuần"
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          size="small"
        />
        <Button variant="contained" onClick={fetchData}>
          Tải dữ liệu
        </Button>
        <Button variant="contained" color="secondary" onClick={calculateScores}>
          Tính toán
        </Button>
        <Button variant="contained" color="success" onClick={saveScores}>
          Lưu
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((rec, idx) => (
              <TableRow key={idx}>
                <TableCell>{rec.className}</TableCell>
                <TableCell>{rec.grade}</TableCell>
                <TableCell>{rec.violationScore}</TableCell>
                <TableCell>{rec.hygieneScore}</TableCell>
                <TableCell>{rec.attendanceScore}</TableCell>
                <TableCell>{rec.lineupScore}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={rec.academicScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = [...records];
                      updated[idx].academicScore = val;
                      setRecords(updated);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={rec.bonusScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const updated = [...records];
                      updated[idx].bonusScore = val;
                      setRecords(updated);
                    }}
                  />
                </TableCell>
                <TableCell>{rec.totalViolation}</TableCell>
                <TableCell>{rec.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
