
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
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassHygieneScore {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  scores: {
    date: string;
    sessions: {
      morning: number[];
      afternoon: number[];
    };
  }[];
  total: number;
}

const ClassHygieneScorePage = () => {
  const [loading, setLoading] = useState(false);
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [scores, setScores] = useState<ClassHygieneScore | null>(null);

  // Fetch weeks
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0].weekNumber);
      }
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  // Hàm khởi tạo hoặc load lại dữ liệu cho tuần
  const initializeData = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/class-hygiene-scores/${weekNumber}`);
      if (res.data) {
        setScores(res.data);
      } else {
        // tạo mới nếu chưa có dữ liệu
        const selected = weekList.find((w) => w.weekNumber === weekNumber);
        if (!selected) return;

        const start = new Date(selected.startDate);
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const day = d.getDay();
          // chỉ lấy T2 -> T6
          if (day >= 1 && day <= 5) {
            dates.push(d.toISOString());
          }
        }

        const emptyScores = dates.map((d) => ({
          date: d,
          sessions: {
            morning: [0, 0, 0],
            afternoon: [0, 0, 0],
          },
        }));

        setScores({
          className: "10A1",
          grade: "10",
          weekNumber,
          scores: emptyScores,
          total: 0,
        });
      }
    } catch (err) {
      console.error("Lỗi khi load dữ liệu tuần:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek !== null) {
      initializeData(selectedWeek);
    }
  }, [selectedWeek, weekList]);

  const toggleScore = (dayIdx: number, session: "morning" | "afternoon", errIdx: number) => {
    if (!scores) return;
    const newScores = { ...scores };
    newScores.scores[dayIdx].sessions[session][errIdx] =
      newScores.scores[dayIdx].sessions[session][errIdx] === 1 ? 0 : 1;
    setScores(newScores);
  };

  const saveScores = async () => {
    if (!scores) return;
    try {
      if (scores._id) {
        await api.put(`/api/class-hygiene-scores/${scores._id}`, scores);
      } else {
        const res = await api.post("/api/class-hygiene-scores", scores);
        setScores(res.data);
      }
      alert("Lưu thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
    }
  };

  const getWeekLabel = (w: AcademicWeek) => {
    const start = new Date(w.startDate).toLocaleDateString("vi-VN");
    const end = new Date(w.endDate).toLocaleDateString("vi-VN");
    return `Tuần ${w.weekNumber} (${start} - ${end})`;
  };

  if (loading || !scores) return <CircularProgress />;

  return (
    <Box p={2}>
      {/* Chọn tuần */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography mr={2}>Chọn tuần:</Typography>
        <Select
          value={selectedWeek ?? ""}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value === selectedWeek) {
              initializeData(value); // reload nếu chọn lại cùng tuần
            }
            setSelectedWeek(value);
          }}
          size="small"
        >
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              {getWeekLabel(w)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Bảng điểm */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ngày</TableCell>
              <TableCell>Buổi sáng</TableCell>
              <TableCell>Buổi chiều</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.scores.map((d, dayIdx) => {
              const date = new Date(d.date).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
              });
              return (
                <TableRow key={dayIdx}>
                  <TableCell>{date}</TableCell>
                  <TableCell>
                    {d.sessions.morning.map((v, errIdx) => (
                      <label key={errIdx} style={{ marginRight: 8 }}>
                        <input
                          type="checkbox"
                          checked={v === 1}
                          onChange={() => toggleScore(dayIdx, "morning", errIdx)}
                        />
                        {` Lỗi ${errIdx + 1}`}
                      </label>
                    ))}
                  </TableCell>
                  <TableCell>
                    {d.sessions.afternoon.map((v, errIdx) => (
                      <label key={errIdx} style={{ marginRight: 8 }}>
                        <input
                          type="checkbox"
                          checked={v === 1}
                          onChange={() => toggleScore(dayIdx, "afternoon", errIdx)}
                        />
                        {` Lỗi ${errIdx + 1}`}
                      </label>
                    ))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2}>
        <Button variant="contained" onClick={saveScores}>
          Lưu
        </Button>
      </Box>
    </Box>
  );
};
export default ClassHygieneScorePage;
