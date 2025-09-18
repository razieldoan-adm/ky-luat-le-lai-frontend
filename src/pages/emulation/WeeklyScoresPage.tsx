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
  Snackbar,
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Class {
  _id: string;
  className: string;
  grade: number;
  homeroomTeacher?: string;
}

interface Violation {
  _id: string;
  className: string;
  penalty: number;
  time: string;
}

interface ScoreRow {
  className: string;
  homeroomTeacher?: string;
  total: number;
  count: number;
}

export default function WeeklyScoresPage() {
  const [weekList, setWeekList] = useState<Week[]>([]);
  const [classList, setClassList] = useState<Class[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Record<number, ScoreRow[]>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations/all/all-student");
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy vi phạm:", err);
      setSnackbar({ open: true, message: "Không tải được dữ liệu vi phạm", severity: "error" });
    }
  };

  const handleWeekChange = async (weekId: string) => {
    const week = weekList.find(w => w._id === weekId) || null;
    setSelectedWeek(week);
    if (!week) return;

    await fetchViolations();

    const start = dayjs(week.startDate).startOf("day");
    const end = dayjs(week.endDate).endOf("day");

    // Lọc vi phạm trong tuần
    const filtered = violations.filter(v => {
      const t = dayjs(v.time);
      return t.isAfter(start) && t.isBefore(end);
    });

    // Gom điểm theo lớp có GVCN
    const grouped: Record<number, ScoreRow[]> = {};
    classList
      .filter(cls => cls.homeroomTeacher) // chỉ lớp có GVCN
      .forEach(cls => {
        const clsViolations = filtered.filter(v => v.className === cls.className);
        const penalties = clsViolations.map(v => v.penalty);
        const total = penalties.reduce((sum, p) => sum + p, 0);

        if (!grouped[cls.grade]) grouped[cls.grade] = [];
        grouped[cls.grade].push({
          className: cls.className,
          homeroomTeacher: cls.homeroomTeacher,
          total,
          count: penalties.length,
        });
      });

    // Xếp hạng trong mỗi khối
    Object.keys(grouped).forEach(grade => {
      grouped[+grade].sort((a, b) => a.total - b.total); // điểm phạt ít → cao
    });

    setScores(grouped);
    setSnackbar({ open: true, message: `Đã tải điểm tuần ${week.weekNumber}`, severity: "success" });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua theo tuần
      </Typography>

      <FormControl sx={{ minWidth: 200, mb: 2 }}>
        <InputLabel id="week-select-label">Chọn tuần</InputLabel>
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

      {Object.keys(scores).length === 0 && (
        <Typography>Chưa có dữ liệu tuần này.</Typography>
      )}

      {Object.entries(scores).map(([grade, rows]) => {
        if (rows.length === 0) return null;
        const bestClass = rows[0].className; // lớp đầu bảng
        return (
          <Paper key={grade} sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Khối {grade}
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lớp</TableCell>
                  <TableCell>GVCN</TableCell>
                  <TableCell align="right">Số lỗi</TableCell>
                  <TableCell align="right">Tổng điểm trừ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={row.className}
                    sx={row.className === bestClass ? { backgroundColor: "rgba(0,200,0,0.1)" } : {}}
                  >
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.homeroomTeacher}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                    <TableCell align="right">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        );
      })}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert severity={snackbar.severity} onClose={handleCloseSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
