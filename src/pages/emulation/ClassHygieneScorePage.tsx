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
  Grid,
} from "@mui/material";
import api from "../../api/api";

interface ClassHygieneScore {
  _id?: string;
  classId: string;
  className?: string;
  grade?: number;
  date: string;
  weekNumber: number;
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

interface WeekOption {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ClassHygieneScorePage() {
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, ClassHygieneScore[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchScores(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/class-hygiene-scores/weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0].weekNumber);
      }
    } catch (err) {
      console.error("Lỗi tải tuần:", err);
    }
  };

  const fetchScores = async (weekNumber: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/class-hygiene-scores/week/${weekNumber}`);
      // res.data = { grade6: [...], grade7: [...], ... }
      setScores(res.data);
    } catch (err) {
      console.error("Lỗi tải điểm:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeScore = (
    grade: string,
    classId: string,
    date: string,
    field: keyof ClassHygieneScore,
    value: number
  ) => {
    setScores((prev) => {
      const updated = { ...prev };
      updated[grade] = updated[grade].map((item) =>
        item.classId === classId && item.date === date
          ? { ...item, [field]: value }
          : item
      );
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      const payload: ClassHygieneScore[] = [];
      Object.values(scores).forEach((gradeScores) => {
        payload.push(...gradeScores);
      });
      await api.post("/class-hygiene-scores/bulk", payload);
      alert("Lưu thành công!");
    } catch (err) {
      console.error("Lỗi lưu:", err);
      alert("Lỗi khi lưu dữ liệu");
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần
      </Typography>

      <Box display="flex" alignItems="center" mb={2}>
        <Select
          value={selectedWeek || ""}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
        >
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
            </MenuItem>
          ))}
        </Select>

        <Button
          variant="contained"
          color="success"
          sx={{ ml: 2 }}
          onClick={handleSave}
        >
          Lưu điểm vệ sinh
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        Object.keys(scores).map((grade) => (
          <Paper key={grade} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6">Khối {grade.replace("grade", "")}</Typography>
            <Grid container spacing={2}>
              {scores[grade].map((row) => (
                <Grid item xs={12} md={6} key={row.classId + row.date}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Lớp {row.className}</TableCell>
                        <TableCell>Ngày {new Date(row.date).toLocaleDateString()}</TableCell>
                        <TableCell>Không trực</TableCell>
                        <TableCell>Không tắt đèn/quạt</TableCell>
                        <TableCell>Không đóng cửa</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell />
                        <TableCell />
                        <TableCell>
                          <input
                            type="number"
                            value={row.absentDuty}
                            onChange={(e) =>
                              handleChangeScore(
                                grade,
                                row.classId,
                                row.date,
                                "absentDuty",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: "40px" }}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            value={row.noLightFan}
                            onChange={(e) =>
                              handleChangeScore(
                                grade,
                                row.classId,
                                row.date,
                                "noLightFan",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: "40px" }}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            value={row.notClosedDoor}
                            onChange={(e) =>
                              handleChangeScore(
                                grade,
                                row.classId,
                                row.date,
                                "notClosedDoor",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: "40px" }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))
      )}
    </Box>
  );
}
