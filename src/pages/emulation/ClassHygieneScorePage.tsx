
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
  Checkbox,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface HygieneRecord {
  date: string;
  absentDutyMorning: boolean;
  noLightFanMorning: boolean;
  notClosedDoorMorning: boolean;
  absentDutyAfternoon: boolean;
  noLightFanAfternoon: boolean;
  notClosedDoorAfternoon: boolean;
}

type HygieneField =
  | "absentDutyMorning"
  | "noLightFanMorning"
  | "notClosedDoorMorning"
  | "absentDutyAfternoon"
  | "noLightFanAfternoon"
  | "notClosedDoorAfternoon";

interface WeekOption {
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: "upcoming" | "current" | "past";
}

export default function ClassHygieneScorePage() {
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [records, setRecords] = useState<HygieneRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/weekly-scores/weeks");
        setWeeks(res.data);
        const current = res.data.find((w: WeekOption) => w.status === "current");
        if (current) setSelectedWeek(current.weekNumber);
      } catch (err) {
        console.error("Lỗi tải danh sách tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) fetchRecords(selectedWeek);
  }, [selectedWeek]);

  const fetchRecords = async (week: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/class-hygiene/week/${week}`);
      if (res.data?.records?.length > 0) {
        setRecords(res.data.records);
      } else {
        const weekInfo = weeks.find((w) => w.weekNumber === week);
        if (!weekInfo) return;
        const start = new Date(weekInfo.startDate);
        const end = new Date(weekInfo.endDate);
        const days: HygieneRecord[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const day = d.getDay();
          if (day === 0 || day === 6) continue; // bỏ T7, CN
          days.push({
            date: d.toISOString().split("T")[0],
            absentDutyMorning: false,
            noLightFanMorning: false,
            notClosedDoorMorning: false,
            absentDutyAfternoon: false,
            noLightFanAfternoon: false,
            notClosedDoorAfternoon: false,
          });
        }
        setRecords(days);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (index: number, field: HygieneField) => {
    setRecords((prev) => {
      const updated = [...prev];
      updated[index][field] = !updated[index][field];
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      setSaving(true);
      await api.post("/class-hygiene/save", { weekNumber: selectedWeek, records });
      setSnackbar({ open: true, message: "Lưu điểm vệ sinh thành công!", severity: "success" });
    } catch (err) {
      console.error("Lỗi lưu:", err);
      setSnackbar({ open: true, message: "Lỗi khi lưu dữ liệu!", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const getWeekLabel = (w: WeekOption) => {
    if (w.status === "upcoming") return `Tuần ${w.weekNumber} (Chưa diễn ra)`;
    if (w.status === "past") return `Tuần ${w.weekNumber} (Đã qua)`;
    return `Tuần ${w.weekNumber} (Hiện tại)`;
  };

  const selectedWeekInfo = weeks.find((w) => w.weekNumber === selectedWeek);
  const disableEditing = selectedWeekInfo?.status === "upcoming";

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm vệ sinh lớp học {selectedWeek ? `(Tuần ${selectedWeek})` : ""}
      </Typography>

      <Box mb={2}>
        <Select
          value={selectedWeek ?? ""}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          displayEmpty
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              {getWeekLabel(w)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">Ngày</TableCell>
                  <TableCell align="center" colSpan={3}>
                    Buổi sáng
                  </TableCell>
                  <TableCell align="center" colSpan={3}>
                    Buổi chiều
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell align="center">Vắng trực</TableCell>
                  <TableCell align="center">Không quạt/đèn</TableCell>
                  <TableCell align="center">Không khóa cửa</TableCell>
                  <TableCell align="center">Vắng trực</TableCell>
                  <TableCell align="center">Không quạt/đèn</TableCell>
                  <TableCell align="center">Không khóa cửa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={r.date}>
                    <TableCell align="center">
                      {new Date(r.date).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </TableCell>

                    {(Object.keys(r) as (keyof HygieneRecord)[])
                      .filter((f): f is HygieneField => f !== "date")
                      .map((field) => (
                        <TableCell key={field} align="center">
                          <Checkbox
                            checked={r[field]}
                            disabled={disableEditing}
                            onChange={() => handleCheckboxChange(i, field)}
                          />
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {!disableEditing && (
            <Box mt={2} textAlign="right">
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu điểm"}
              </Button>
            </Box>
          )}
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

