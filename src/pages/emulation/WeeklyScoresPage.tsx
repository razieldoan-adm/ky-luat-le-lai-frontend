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
  CircularProgress,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface RawScore {
  className: string;
  grade: string;
  attendanceScore: number;
  hygieneScore: number;
  lineupScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
}

interface Week {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Setting {
  disciplineMax: number; // giới hạn kỷ luật max
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [rawScores, setRawScores] = useState<RawScore[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Load danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/academic-weeks");
        setWeeks(res.data);
        if (res.data.length > 0) {
          setSelectedWeek(res.data[0].weekNumber);
        }
      } catch (err) {
        console.error("Lỗi load tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Load setting (giới hạn kỷ luật max)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings(res.data);
      } catch (err) {
        console.error("Lỗi load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Load dữ liệu thô từ API tổng hợp
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchRawScores = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/class-weekly-scores/temp", {
          params: { weekNumber: selectedWeek },
        });
        setRawScores(res.data);
      } catch (err) {
        console.error("Lỗi load dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRawScores();
  }, [selectedWeek]);

  // Cập nhật điểm nhập
  const handleInputChange = (className: string, field: "academicScore" | "bonusScore", value: number) => {
    setRawScores((prev) =>
      prev.map((row) =>
        row.className === className ? { ...row, [field]: value } : row
      )
    );
  };

  // Tính toán
  const calculateDisciplinePoint = (row: RawScore) => {
    if (!settings) return 0;
    const penalty = row.violationScore + row.attendanceScore + row.hygieneScore + row.lineupScore;
    return settings.disciplineMax - penalty;
  };

  const calculateTotalScore = (row: RawScore) => {
    return calculateDisciplinePoint(row) + row.academicScore + row.bonusScore;
  };

  // Gom nhóm theo grade
  const groupedScores = rawScores.reduce<Record<string, RawScore[]>>((acc, cur) => {
    if (!acc[cur.grade]) acc[cur.grade] = [];
    acc[cur.grade].push(cur);
    return acc;
  }, {});

  // Lưu dữ liệu
  const handleSave = async () => {
    if (!selectedWeek || !settings) return;
    setSaving(true);
    try {
      const payload = rawScores.map((row) => ({
        ...row,
        weekNumber: selectedWeek,
        disciplinePoint: calculateDisciplinePoint(row),
        totalScore: calculateTotalScore(row),
      }));

      await api.post("/api/class-weekly-scores", payload);

      setSnackbar({ open: true, message: "Lưu thành công!", severity: "success" });
    } catch (err) {
      console.error("Lỗi lưu dữ liệu:", err);
      setSnackbar({ open: true, message: "Lỗi khi lưu!", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Nhập & Tính toán điểm thi đua tuần
      </Typography>

      <FormControl sx={{ minWidth: 220, mb: 3 }}>
        <InputLabel id="week-select-label">Chọn tuần</InputLabel>
        <Select
          labelId="week-select-label"
          value={selectedWeek}
          label="Chọn tuần"
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
        >
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <CircularProgress />
      ) : (
        Object.keys(groupedScores).map((grade) => {
          // Sắp xếp theo totalScore
          const sorted = [...groupedScores[grade]].sort(
            (a, b) => calculateTotalScore(b) - calculateTotalScore(a)
          );
          return (
            <Paper key={grade} sx={{ mb: 4, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Khối {grade}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng</TableCell>
                    <TableCell>Lớp</TableCell>
                    <TableCell align="center">Kỷ luật</TableCell>
                    <TableCell align="center">Chuyên cần</TableCell>
                    <TableCell align="center">Vệ sinh</TableCell>
                    <TableCell align="center">Xếp hàng</TableCell>
                    <TableCell align="center">Học tập</TableCell>
                    <TableCell align="center">Điểm thưởng</TableCell>
                    <TableCell align="center">Điểm kỷ luật còn lại</TableCell>
                    <TableCell align="center">Tổng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map((row, index) => (
                    <TableRow
                      key={row.className}
                      sx={{
                        backgroundColor: index === 0 ? "rgba(255, 215, 0, 0.3)" : "inherit",
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      <TableCell align="center">{row.violationScore}</TableCell>
                      <TableCell align="center">{row.attendanceScore}</TableCell>
                      <TableCell align="center">{row.hygieneScore}</TableCell>
                      <TableCell align="center">{row.lineupScore}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={row.academicScore}
                          onChange={(e) =>
                            handleInputChange(row.className, "academicScore", Number(e.target.value))
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={row.bonusScore}
                          onChange={(e) =>
                            handleInputChange(row.className, "bonusScore", Number(e.target.value))
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="center">{calculateDisciplinePoint(row)}</TableCell>
                      <TableCell align="center">
                        <b>{calculateTotalScore(row)}</b>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          );
        })
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={saving || !rawScores.length}
      >
        {saving ? "Đang lưu..." : "Lưu kết quả"}
      </Button>

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
