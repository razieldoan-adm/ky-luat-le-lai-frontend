
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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Checkbox,
} from "@mui/material";
import api from "../../api/api";

interface ClassScore {
  className: string;
  grade: string;
  scores: number[][]; // [day][session]
  totalScore: number;
}

interface WeekOption {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ClassHygieneScorePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");

  // Lấy danh sách tuần
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

  // Lấy dữ liệu theo tuần
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/class-hygiene-scores?weekNumber=${selectedWeek}`);
        if (res.data.length > 0) {
          setScores(res.data);
        } else {
          // Tạo mới dữ liệu rỗng
          const classRes = await api.get("/classes");
          const newScores = classRes.data.map((c: any) => ({
            className: c.name,
            grade: c.grade,
            scores: Array(5).fill(null).map(() => Array(3).fill(0)), // 5 ngày * 3 buổi
            totalScore: 0,
          }));
          setScores(newScores);
        }
      } catch (err) {
        console.error("❌ Lỗi khi load hygiene scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [selectedWeek]);

  const handleCheckboxChange = (
    classIdx: number,
    dayIdx: number,
    sessionIdx: number
  ) => {
    const newScores = [...scores];
    newScores[classIdx].scores[dayIdx][sessionIdx] =
      newScores[classIdx].scores[dayIdx][sessionIdx] === 1 ? 0 : 1;

    // Tính lại tổng
    const total = newScores[classIdx].scores
      .flat()
      .reduce((acc, val) => acc + val, 0);
    newScores[classIdx].totalScore = total;

    setScores(newScores);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    setSaving(true);
    try {
      await api.post("/class-hygiene-scores", {
        weekNumber: selectedWeek,
        scores,
      });
      alert("Lưu thành công");
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      alert("Lỗi khi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Nhập điểm vệ sinh lớp
      </Typography>

      {/* Chọn tuần */}
      <Select
        value={selectedWeek}
        onChange={(e) => setSelectedWeek(Number(e.target.value))}
        displayEmpty
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">-- Chọn tuần --</MenuItem>
        {weeks.map((w) => (
          <MenuItem key={w._id} value={w.weekNumber}>
            Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
          </MenuItem>
        ))}
      </Select>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                {Array.from({ length: 5 }).map((_, dayIdx) => (
                  <TableCell key={dayIdx} align="center">
                    Ngày {dayIdx + 2}
                  </TableCell>
                ))}
                <TableCell align="center">Tổng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((cls, classIdx) => (
                <TableRow key={cls.className}>
                  <TableCell>{cls.className}</TableCell>
                  {cls.scores.map((dayScores, dayIdx) => (
                    <TableCell key={dayIdx} align="center">
                      {dayScores.map((val, sessionIdx) => (
                        <Checkbox
                          key={sessionIdx}
                          checked={val === 1}
                          onChange={() =>
                            handleCheckboxChange(classIdx, dayIdx, sessionIdx)
                          }
                          size="small"
                        />
                      ))}
                    </TableCell>
                  ))}
                  <TableCell align="center">{cls.totalScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Đang lưu..." : "Lưu điểm"}
      </Button>
    </Box>
  );
}
