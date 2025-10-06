import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

type Session = "Morning" | "Afternoon";

interface HygieneRecord {
  _id?: string;
  classId: string;
  className?: string;
  date: string;
  weekNumber: number;
  absentDutyMorning: number;
  absentDutyAfternoon: number;
  noLightFanMorning: number;
  noLightFanAfternoon: number;
  notClosedDoorMorning: number;
  notClosedDoorAfternoon: number;
  total?: number;
}

interface ClassOption {
  _id: string;
  name: string;
}

const ClassHygieneScorePage = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [scores, setScores] = useState<HygieneRecord[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [notification, setNotification] = useState<string | null>(null);

  // 🧩 Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        setClasses(res.data);
      } catch (err) {
        console.error("Lỗi khi tải lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // 🧩 Load điểm vệ sinh theo tuần
  const fetchScores = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/class-hygiene-scores?weekNumber=${weekNumber}`);
      const existingScores: HygieneRecord[] = res.data;

      // Danh sách ngày trong tuần (thứ 2 → CN)
      const weekDates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1 + i); // bắt đầu từ thứ 2
        return d.toISOString().split("T")[0];
      });

      // Tạo danh sách đầy đủ (nếu thiếu dữ liệu)
      const filledScores: HygieneRecord[] = [];
      for (const cls of classes) {
        for (const date of weekDates) {
          const exist = existingScores.find(
            (s) => s.classId === cls._id && s.date === date
          );
          filledScores.push(
            exist || {
              classId: cls._id,
              className: cls.name,
              date,
              weekNumber,
              absentDutyMorning: 0,
              absentDutyAfternoon: 0,
              noLightFanMorning: 0,
              noLightFanAfternoon: 0,
              notClosedDoorMorning: 0,
              notClosedDoorAfternoon: 0,
            }
          );
        }
      }

      setScores(filledScores);
    } catch (err) {
      console.error("Lỗi khi tải điểm:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classes.length > 0) fetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, weekNumber]);

  // 🧩 Toggle checkbox
  const handleCheckChange = (
    classId: string,
    date: string,
    session: Session,
    field: "absentDuty" | "noLightFan" | "notClosedDoor",
    value: number
  ) => {
    const updated = scores.map((s) => {
      if (s.classId === classId && s.date === date) {
        const key = `${field}${session}` as keyof HygieneRecord;
        return { ...s, [key]: value };
      }
      return s;
    });
    setScores(updated);
  };

  // 🧩 Lưu dữ liệu
  const handleSave = async () => {
    try {
      setLoading(true);
      await api.post("/class-hygiene-scores/save", {
        weekNumber,
        scores,
      });
      setNotification("Đã lưu điểm vệ sinh thành công!");
    } catch (err) {
      console.error("❌ Lỗi khi lưu:", err);
      setNotification("Lỗi khi lưu điểm vệ sinh!");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Render bảng
  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm vệ sinh lớp học (Tuần {weekNumber})
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell align="center">Buổi sáng - Trực nhật vắng</TableCell>
                <TableCell align="center">Buổi sáng - Quạt/Đèn</TableCell>
                <TableCell align="center">Buổi sáng - Cửa</TableCell>
                <TableCell align="center">Buổi chiều - Trực nhật vắng</TableCell>
                <TableCell align="center">Buổi chiều - Quạt/Đèn</TableCell>
                <TableCell align="center">Buổi chiều - Cửa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.date}</TableCell>

                  {/* Sáng */}
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.absentDutyMorning === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Morning",
                          "absentDuty",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.noLightFanMorning === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Morning",
                          "noLightFan",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.notClosedDoorMorning === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Morning",
                          "notClosedDoor",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>

                  {/* Chiều */}
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.absentDutyAfternoon === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Afternoon",
                          "absentDuty",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.noLightFanAfternoon === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Afternoon",
                          "noLightFan",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <input
                      type="checkbox"
                      checked={row.notClosedDoorAfternoon === 1}
                      onChange={(e) =>
                        handleCheckChange(
                          row.classId,
                          row.date,
                          "Afternoon",
                          "notClosedDoor",
                          e.target.checked ? 1 : 0
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={2}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={loading}>
          Lưu điểm vệ sinh
        </Button>
      </Box>

      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
      >
        <Alert severity="success">{notification}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassHygieneScorePage;
