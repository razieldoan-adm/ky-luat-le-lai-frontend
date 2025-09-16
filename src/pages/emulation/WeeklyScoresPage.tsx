import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface StudyWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassScore {
  className: string;
  grade: string;
  academicScore: number; // nhập trực tiếp
  bonusScore: number; // nhập trực tiếp
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
}

const disciplineMax = 100; // ví dụ điểm nề nếp tối đa

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<StudyWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Lấy danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/academic-weeks/study-weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("Lỗi load weeks:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Gom dữ liệu từ 4 API
  const handleAggregate = async () => {
    if (!selectedWeek) return;
    try {
      const [attendanceRes, hygieneRes, lineupRes, violationRes] = await Promise.all([
        api.get(`/api/classattendancesummaries?weekNumber=${selectedWeek}`),
        api.get(`/api/classhygienescores?weekNumber=${selectedWeek}`),
        api.get(`/api/classlineupsummaries?weekNumber=${selectedWeek}`),
        api.get(`/api/classviolationscores?weekNumber=${selectedWeek}`),
      ]);

      const map: Record<string, ClassScore> = {};

      const mergeData = (arr: any[], field: keyof ClassScore, gradeField = "grade") => {
        arr.forEach((item) => {
          const cls = item.className || item.class; // tuỳ backend trả về
          if (!map[cls]) {
            map[cls] = {
              className: cls,
              grade: item[gradeField] || "",
              academicScore: 0,
              bonusScore: 0,
              disciplineScore: 0,
              hygieneScore: 0,
              attendanceScore: 0,
              lineUpScore: 0,
            };
          }
          map[cls][field] = item.score || 0;
        });
      };

      mergeData(attendanceRes.data, "attendanceScore");
      mergeData(hygieneRes.data, "hygieneScore");
      mergeData(lineupRes.data, "lineUpScore");
      mergeData(violationRes.data, "disciplineScore");

      setScores(Object.values(map));
      setSnackbar({ open: true, message: "Đã gom dữ liệu thành công", severity: "success" });
    } catch (err) {
      console.error("Lỗi gom dữ liệu:", err);
      setSnackbar({ open: true, message: "Gom dữ liệu thất bại", severity: "error" });
    }
  };

  // Tính xếp hạng
  const handleCalculateRank = () => {
    const updated = [...scores];
    updated.forEach((s) => {
      const totalViolation =
        disciplineMax - ((s.disciplineScore || 0) + (s.hygieneScore || 0) + (s.attendanceScore || 0) + (s.lineUpScore || 0));
      s.totalViolation = totalViolation;
      s.totalRankScore = (s.academicScore || 0) + totalViolation + (s.bonusScore || 0);
    });

    // sắp rank theo grade
    const grouped: Record<string, ClassScore[]> = {};
    updated.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => (b.totalRankScore || 0) - (a.totalRankScore || 0));
      arr.forEach((s, i) => (s.rank = i + 1));
    });

    setScores(updated);
    setSnackbar({ open: true, message: "Đã tính xếp hạng", severity: "success" });
  };

  // Lưu
  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/weekly-scores", {
        weekNumber: selectedWeek,
        scores,
      });
      setSnackbar({ open: true, message: "Đã lưu thành công", severity: "success" });
    } catch (err) {
      console.error("Lỗi lưu:", err);
      setSnackbar({ open: true, message: "Lưu thất bại", severity: "error" });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua theo tuần
      </Typography>

      <Box display="flex" gap={2} mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value as number)}
          displayEmpty
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
            </MenuItem>
          ))}
        </Select>
        <Button variant="contained" onClick={handleAggregate}>
          Gom dữ liệu
        </Button>
        <Button variant="contained" color="secondary" onClick={handleCalculateRank}>
          Tính xếp hạng
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          Lưu
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Tổng nề nếp</TableCell>
              <TableCell>Tổng xếp hạng</TableCell>
              <TableCell>Thứ hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.grade}</TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={s.academicScore}
                    onChange={(e) => {
                      const updated = [...scores];
                      const idx = updated.findIndex((x) => x.className === s.className);
                      updated[idx].academicScore = Number(e.target.value);
                      setScores(updated);
                    }}
                  />
                </TableCell>
                <TableCell>{s.disciplineScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.lineUpScore}</TableCell>
                <TableCell>
                  <input
                    type="number"
                    value={s.bonusScore}
                    onChange={(e) => {
                      const updated = [...scores];
                      const idx = updated.findIndex((x) => x.className === s.className);
                      updated[idx].bonusScore = Number(e.target.value);
                      setScores(updated);
                    }}
                  />
                </TableCell>
                <TableCell>{s.totalViolation ?? "-"}</TableCell>
                <TableCell>{s.totalRankScore ?? "-"}</TableCell>
                <TableCell>{s.rank ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
