
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface HygieneScore {
  classId: string;
  className: string;
  grade: number;
  date: string;
  weekNumber: number;
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
  total?: number;
}

export default function ClassHygieneScorePage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<Record<number, HygieneScore[]>>({}); // group theo khối

  // Load danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/weekly-scores/weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("❌ Lỗi khi load weeks:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Load dữ liệu hygiene khi đổi tuần
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `/class-hygiene-scores/by-week?weekNumber=${selectedWeek}`
        );

        const grouped: Record<number, HygieneScore[]> = {};
        res.data.forEach((s: HygieneScore) => {
          if (!grouped[s.grade]) grouped[s.grade] = [];
          grouped[s.grade].push(s);
        });

        setScores(grouped);
      } catch (err) {
        console.error("❌ Lỗi khi load hygiene scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [selectedWeek]);

  // Xử lý thay đổi input
  const handleChangeScore = (
    grade: number,
    classId: string,
    date: string,
    field: keyof HygieneScore,
    value: number
  ) => {
    setScores((prev) => {
      const updated = { ...prev };
      updated[grade] = updated[grade].map((s) =>
        s.classId === classId && s.date === date ? { ...s, [field]: value } : s
      );
      return updated;
    });
  };

  // Lưu hygiene scores
  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      const allScores = Object.values(scores).flat();
      await api.post("/class-hygiene-scores/save", {
        weekNumber: selectedWeek,
        scores: allScores,
      });
      alert("✅ Lưu điểm vệ sinh thành công!");
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      alert("❌ Lỗi khi lưu điểm vệ sinh!");
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần (2 buổi × 3 loại lỗi)
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Select
          value={selectedWeek || ""}
          displayEmpty
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={!selectedWeek}
        >
          LƯU ĐIỂM VỆ SINH
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Chú thích: 🚫 Không trực vệ sinh | 💡 Không tắt đèn/quạt đầu giờ hoặc giờ
        chơi | 🚪 Không đóng cửa lớp
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        Object.entries(scores).map(([grade, rows]) => (
          <Paper key={grade} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Khối {grade}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lớp</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>🚫</TableCell>
                  <TableCell>💡</TableCell>
                  <TableCell>🚪</TableCell>
                  <TableCell>Tổng</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.absentDuty}
                        onChange={(e) =>
                          handleChangeScore(
                            Number(grade),
                            row.classId,
                            row.date,
                            "absentDuty",
                            Number(e.target.value)
                          )
                        }
                        sx={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.noLightFan}
                        onChange={(e) =>
                          handleChangeScore(
                            Number(grade),
                            row.classId,
                            row.date,
                            "noLightFan",
                            Number(e.target.value)
                          )
                        }
                        sx={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.notClosedDoor}
                        onChange={(e) =>
                          handleChangeScore(
                            Number(grade),
                            row.classId,
                            row.date,
                            "notClosedDoor",
                            Number(e.target.value)
                          )
                        }
                        sx={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.absentDuty + row.noLightFan + row.notClosedDoor}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))
      )}
    </Box>
  );
}

