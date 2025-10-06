
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Button,
  CircularProgress,
  Paper,
  Alert,
} from "@mui/material";
import api from "../../api/api";

type Session = "Morning" | "Afternoon";

interface HygieneRecord {
  _id?: string;
  classId: string;
  className: string;
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

const ClassHygieneScorePage = () => {
  const [scores, setScores] = useState<HygieneRecord[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [weeks, setWeeks] = useState<number[]>([]);

  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  };

  useEffect(() => {
    const today = new Date();
    const thisWeek = getWeekNumber(today);
    setCurrentWeek(thisWeek);
    setWeekNumber(thisWeek);
    setWeeks(Array.from({ length: 52 }, (_, i) => i + 1));
  }, []);

  useEffect(() => {
    if (!weekNumber) return;
    setLoading(true);
    api
      .get(`/class-hygiene/by-week?weekNumber=${weekNumber}`)
      .then((res) => setScores(res.data))
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [weekNumber]);

  const handleCheckboxChange = (
    classId: string,
    date: string,
    session: Session,
    field: "absentDuty" | "noLightFan" | "notClosedDoor",
    checked: boolean
  ) => {
    const updated = scores.map((s) => {
      if (s.classId === classId && s.date === date) {
        const key = `${field}${session}` as keyof HygieneRecord;
        return { ...s, [key]: checked ? 1 : 0 };
      }
      return s;
    });
    setScores(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/class-hygiene/save", { weekNumber, scores });
      setMessage("Đã lưu điểm vệ sinh thành công.");
      const res = await api.get(`/class-hygiene/by-week?weekNumber=${weekNumber}`);
      setScores(res.data);
    } catch (err) {
      setMessage("Lỗi khi lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };

  // ❗ Chỉ tuần chưa tới mới vô hiệu hóa chỉnh sửa
  const disableEditing = weekNumber > currentWeek;

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm vệ sinh lớp học (Tuần {weekNumber})
      </Typography>

      <Box mb={2}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Chọn tuần:
        </Typography>
        <select
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          {weeks.map((w) => (
            <option
              key={w}
              value={w}
              disabled={w > currentWeek + 1} // tuần chưa tới thì disable
            >
              Tuần {w}{" "}
              {w < currentWeek
                ? "(Đã qua)"
                : w === currentWeek
                ? "(Hiện tại)"
                : "(Chưa tới)"}
            </option>
          ))}
        </select>
      </Box>

      {message && (
        <Alert
          severity={message.includes("Lỗi") ? "error" : "success"}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ overflowX: "auto", width: "100%" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell align="center" colSpan={3}>
                  Buổi sáng
                </TableCell>
                <TableCell align="center" colSpan={3}>
                  Buổi chiều
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell>Vắng trực</TableCell>
                <TableCell>Không quạt/đèn</TableCell>
                <TableCell>Không khóa cửa</TableCell>
                <TableCell>Vắng trực</TableCell>
                <TableCell>Không quạt/đèn</TableCell>
                <TableCell>Không khóa cửa</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((s) => (
                <TableRow key={`${s.classId}-${s.date}`}>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                  {(["Morning", "Afternoon"] as Session[]).flatMap((session) => [
                    <TableCell key={`${s.classId}-${session}-1`} align="center">
                      <Checkbox
                        size="small"
                        checked={!!s[`absentDuty${session}` as keyof HygieneRecord]}
                        onChange={(e) =>
                          handleCheckboxChange(
                            s.classId,
                            s.date,
                            session,
                            "absentDuty",
                            e.target.checked
                          )
                        }
                        disabled={disableEditing}
                      />
                    </TableCell>,
                    <TableCell key={`${s.classId}-${session}-2`} align="center">
                      <Checkbox
                        size="small"
                        checked={!!s[`noLightFan${session}` as keyof HygieneRecord]}
                        onChange={(e) =>
                          handleCheckboxChange(
                            s.classId,
                            s.date,
                            session,
                            "noLightFan",
                            e.target.checked
                          )
                        }
                        disabled={disableEditing}
                      />
                    </TableCell>,
                    <TableCell key={`${s.classId}-${session}-3`} align="center">
                      <Checkbox
                        size="small"
                        checked={!!s[`notClosedDoor${session}` as keyof HygieneRecord]}
                        onChange={(e) =>
                          handleCheckboxChange(
                            s.classId,
                            s.date,
                            session,
                            "notClosedDoor",
                            e.target.checked
                          )
                        }
                        disabled={disableEditing}
                      />
                    </TableCell>,
                  ])}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {!disableEditing && (
        <Box mt={2}>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu điểm"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ClassHygieneScorePage;
