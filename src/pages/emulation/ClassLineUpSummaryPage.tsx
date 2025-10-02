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
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface ClassData {
  _id: string;
  name: string;
  grade: number;
}

interface ScoreData {
  [classId: string]: {
    [attempt: number]: number;
  };
}

const attempts = Array.from({ length: 10 }, (_, i) => i + 1);

export default function ClassLineUpSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [scores, setScores] = useState<ScoreData>({});
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  useEffect(() => {
    fetchClasses();
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchScores(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/classes");
      setClasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/weekly-scores/weeks");
      setWeeks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScores = async (week: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/class-lineup-summaries?week=${week}`);
      const formatted: ScoreData = {};
      res.data.forEach((item: any) => {
        formatted[item.classId] = {};
        attempts.forEach((a) => {
          formatted[item.classId][a] = item.scores?.[a] || 0;
        });
      });
      setScores(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (classId: string, attempt: number, value: string) => {
    setScores((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        [attempt]: Number(value),
      },
    }));
  };

  const calculateTotals = () => {
    const updated: ScoreData = {};
    Object.keys(scores).forEach((classId) => {
      updated[classId] = { ...scores[classId] };
      let total = 0;
      attempts.forEach((a) => {
        total += updated[classId][a] || 0;
      });
      updated[classId][11] = total; // dùng key 11 cho cột Tổng
    });
    setScores(updated);
  };

  const saveScores = async () => {
    try {
      const payload = Object.keys(scores).map((classId) => ({
        classId,
        week: selectedWeek,
        scores: scores[classId],
      }));
      await api.post("/class-lineup-summaries", payload);
      alert("Lưu điểm thành công!");
      fetchWeeks();
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Nhập điểm xếp hạng theo tuần
      </Typography>

      <Box mb={2}>
        <Typography variant="body2">Chọn tuần</Typography>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          size="small"
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((week) => (
            <MenuItem
              key={week}
              value={week}
              style={{
                backgroundColor: weeks.includes(week) ? "#f0f0f0" : "white",
                color: weeks.includes(week) ? "gray" : "black",
              }}
              disabled={weeks.includes(week)}
            >
              Tuần {week}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Typography variant="body2" color="textSecondary" mb={2}>
        1. Lớp xếp hàng chậm  
        <br />2. Nhiều HS ngồi trong lớp giữ chỗ, không ra xếp hàng  
        <br />3. Mất trật tự trong khi xếp hàng giờ SHDC  
        <br />4. Ồn ào, đùa giỡn khi di chuyển lên lớp
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {[6, 7, 8, 9].map((grade) => (
            <Box key={grade} mb={3}>
              <Typography variant="h6">Khối {grade}</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      {attempts.map((a) => (
                        <TableCell key={a} align="center">
                          Lần {a}
                        </TableCell>
                      ))}
                      <TableCell align="center">Tổng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes
                      .filter((c) => c.grade === grade)
                      .map((c) => (
                        <TableRow key={c._id}>
                          <TableCell>{c.name}</TableCell>
                          {attempts.map((a) => (
                            <TableCell key={a} align="center">
                              <TextField
                                type="number"
                                variant="outlined"
                                size="small"
                                value={scores[c._id]?.[a] || ""}
                                onChange={(e) =>
                                  handleScoreChange(c._id, a, e.target.value)
                                }
                                inputProps={{
                                  min: 0,
                                  max: 10,
                                  style: { textAlign: "center", width: "50px" },
                                }}
                              />
                            </TableCell>
                          ))}
                          <TableCell align="center">
                            {scores[c._id]?.[11] || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </>
      )}

      <Box mt={2} display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={calculateTotals}>
          TÍNH TỔNG
        </Button>
        <Button variant="contained" color="success" onClick={saveScores}>
          LƯU ĐIỂM
        </Button>
      </Box>
    </Box>
  );
}
