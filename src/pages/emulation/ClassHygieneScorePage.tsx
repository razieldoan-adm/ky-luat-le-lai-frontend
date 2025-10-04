
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

// Kiểu dữ liệu
interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassInfo {
  _id: string;
  name: string;
  grade: number;
}

interface HygieneScore {
  classId: string;
  date: string; // YYYY-MM-DD
  session: "morning" | "afternoon";
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

// Key lưu trong state: classId_date_session_violation
type ScoreKey = string;

const VIOLATIONS = [
  { key: "absentDuty", label: "Không trực vệ sinh" },
  { key: "noLightFan", label: "Không tắt đèn/quạt" },
  { key: "notClosedDoor", label: "Không đóng cửa lớp" },
];

const ClassHygieneScorePage = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<{ [key: ScoreKey]: boolean }>({});

  // Lấy danh sách tuần
  useEffect(() => {
    api.get("/weeks").then((res) => {
      setWeeks(res.data);
    });
  }, []);

  // Khi chọn tuần → load lớp + hygiene scores
  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);

    // lấy ngày trong tuần
    const week = weeks.find((w) => w._id === selectedWeek);
    if (week) {
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);
      const days: string[] = [];
      let current = new Date(start);
      while (current <= end) {
        days.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      setDates(days);
    }

    Promise.all([
      api.get("/classes"),
      api.get(`/class-hygiene-scores/week/${selectedWeek}`),
    ])
      .then(([clsRes, scoreRes]) => {
        setClasses(clsRes.data);

        // Chuyển dữ liệu backend thành state checkbox
        const newScores: { [key: ScoreKey]: boolean } = {};
        scoreRes.data.forEach((s: HygieneScore) => {
          VIOLATIONS.forEach((v) => {
            const key = `${s.classId}_${s.date}_${s.session}_${v.key}`;
            newScores[key] = (s as any)[v.key] > 0;
          });
        });
        setScores(newScores);
      })
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  // Toggle checkbox
  const handleToggle = (
    classId: string,
    date: string,
    session: "morning" | "afternoon",
    violation: string
  ) => {
    const key = `${classId}_${date}_${session}_${violation}`;
    setScores((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Tính tổng lỗi mỗi lớp
  const getTotalForClass = (classId: string) => {
    return Object.entries(scores).reduce((sum, [key, value]) => {
      if (key.startsWith(classId) && value) {
        return sum + 1;
      }
      return sum;
    }, 0);
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    if (!selectedWeek) return;
    setLoading(true);

    const payload: HygieneScore[] = [];
    classes.forEach((cls) => {
      dates.forEach((date) => {
        ["morning", "afternoon"].forEach((session) => {
          const item: HygieneScore = {
            classId: cls._id,
            date,
            session: session as "morning" | "afternoon",
            absentDuty: scores[`${cls._id}_${date}_${session}_absentDuty`] ? 1 : 0,
            noLightFan: scores[`${cls._id}_${date}_${session}_noLightFan`] ? 1 : 0,
            notClosedDoor: scores[`${cls._id}_${date}_${session}_notClosedDoor`] ? 1 : 0,
          };
          payload.push(item);
        });
      });
    });

    await api.post("/class-hygiene-scores/bulk", {
      weekId: selectedWeek,
      scores: payload,
    });

    setLoading(false);
    alert("Đã lưu thành công!");
  };

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần (2 buổi × 3 loại lỗi)
      </Typography>

      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <Select
          size="small"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} -{" "}
              {new Date(w.endDate).toLocaleDateString()})
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="success"
          disabled={!selectedWeek || loading}
          onClick={handleSave}
        >
          LƯU ĐIỂM VỆ SINH
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        weeks.length > 0 &&
        selectedWeek &&
        [6, 7, 8, 9].map((grade) => (
          <Box key={grade} mb={4}>
            <Typography variant="subtitle1" gutterBottom>
              Khối {grade}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    {dates.map((date) => (
                      <TableCell key={date} align="center" colSpan={6}>
                        {new Date(date).toLocaleDateString("vi-VN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                        <br />
                        (Sáng / Chiều)
                      </TableCell>
                    ))}
                    <TableCell>Tổng</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell />
                    {dates.map((date) => (
                      <TableCell key={date} align="center" colSpan={6}>
                        {["morning", "afternoon"].map((session) =>
                          VIOLATIONS.map((v) => (
                            <TableCell
                              key={`${date}_${session}_${v.key}`}
                              align="center"
                            >
                              {session === "morning" ? "S" : "C"}-{v.label[0]}
                            </TableCell>
                          ))
                        )}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classes
                    .filter((c) => c.grade === grade)
                    .map((cls) => (
                      <TableRow key={cls._id}>
                        <TableCell>{cls.name}</TableCell>
                        {dates.map((date) =>
                          ["morning", "afternoon"].map((session) =>
                            VIOLATIONS.map((v) => {
                              const key = `${cls._id}_${date}_${session}_${v.key}`;
                              return (
                                <TableCell key={key} align="center">
                                  <Checkbox
                                    checked={scores[key] || false}
                                    onChange={() =>
                                      handleToggle(cls._id, date, session as any, v.key)
                                    }
                                  />
                                </TableCell>
                              );
                            })
                          )
                        )}
                        <TableCell align="center">{getTotalForClass(cls._id)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}
    </Box>
  );
};

export default ClassHygieneScorePage;
