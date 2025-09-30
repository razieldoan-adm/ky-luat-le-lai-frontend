import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Paper,
  Snackbar,
  Alert,
  Divider,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  _id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ScoreRow {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [hasData, setHasData] = useState(false);
  const [needUpdate, setNeedUpdate] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ================= Helper =================
  const formatDateShort = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  const normalizeScores = (arr: any[], weekNumber: number): ScoreRow[] =>
    (arr || []).map((r: any) => ({
      className: r.className || "",
      grade: String(r.grade ?? "undefined"),
      weekNumber,
      academicScore: Number(r.academicScore ?? 0),
      bonusScore: Number(r.bonusScore ?? 0),
      violationScore: Number(r.violationScore ?? 0),
      hygieneScore: Number(r.hygieneScore ?? 0),
      attendanceScore: Number(r.attendanceScore ?? 0),
      lineUpScore: Number(r.lineUpScore ?? r.lineupScore ?? 0),
      totalViolation: Number(r.totalViolation ?? 0),
      totalScore: Number(r.totalScore ?? 0),
      ranking: Number(r.ranking ?? r.rank ?? 0),
    }));

  // ================= Init =================
  useEffect(() => {
    fetchWeeks();
    fetchWeeksWithData();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized: Week[] = (res.data || []).map((w: any, idx: number) => ({
        _id: w._id || String(idx),
        weekNumber: Number(w.weekNumber ?? idx + 1),
        startDate: w.startDate || "",
        endDate: w.endDate || "",
      }));
      setWeeks(normalized);
    } catch (err) {
      console.error("Lỗi lấy tuần:", err);
    }
  };

  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get("/weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy weeksWithData:", err);
    }
  };

  // ================= Load tuần =================
  const loadWeekData = async (weekNumber: number) => {
    try {
      const res = await api.get("/weekly-scores", { params: { weekNumber } });
      const existing = normalizeScores(res.data || [], weekNumber);
      if (existing.length > 0) {
        setScores(existing);
        setHasData(true);
        setSaved(true);
        // check changes
        const check = await api.get(`/weekly-scores/check-changes/${weekNumber}`);
        setNeedUpdate(check.data?.changed ?? false);
      } else {
        setScores([]);
        setHasData(false);
        setSaved(false);
        setNeedUpdate(false);
      }
    } catch (err) {
      console.error("Load tuần lỗi:", err);
    }
  };

  useEffect(() => {
    if (selectedWeek) {
      loadWeekData(selectedWeek.weekNumber);
    } else {
      setScores([]);
      setHasData(false);
    }
  }, [selectedWeek]);

  // ================= Actions =================
  const handleLoadTemp = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/weekly-scores/temp", {
        params: { weekNumber: selectedWeek.weekNumber },
      });
      const tempScores = normalizeScores(res.data || [], selectedWeek.weekNumber);
      setScores(tempScores);
      setHasData(true);
      setSaved(false);
      setNeedUpdate(false);
    } catch (err) {
      console.error("Load temp error:", err);
    }
  };

  const handleSave = async () => {
    if (!selectedWeek || !scores.length) return;
    try {
      await api.post(`/weekly-scores/save`, {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      await loadWeekData(selectedWeek.weekNumber);
      fetchWeeksWithData();
      setSnackbar({
        open: true,
        message: "Đã lưu dữ liệu tuần",
        severity: "success",
      });
      setSaved(true);
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi lưu dữ liệu",
        severity: "error",
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedWeek) return;
    try {
      await api.post(`/weekly-scores/update/${selectedWeek.weekNumber}`);
      await loadWeekData(selectedWeek.weekNumber);
      setSnackbar({
        open: true,
        message: "Đã cập nhật dữ liệu tuần",
        severity: "success",
      });
    } catch (err) {
      console.error("Update error:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi cập nhật dữ liệu",
        severity: "error",
      });
    }
  };

  const handleExport = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get(`/weekly-scores/export/${selectedWeek.weekNumber}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly_scores_${selectedWeek.weekNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedWeek) return;
    try {
      await api.delete(`/weekly-scores/${selectedWeek.weekNumber}`);
      setSnackbar({
        open: true,
        message: "Đã xoá dữ liệu tuần",
        severity: "success",
      });
      setScores([]);
      setHasData(false);
      setSaved(false);
      fetchWeeksWithData();
      setConfirmDelete(false);
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi xoá dữ liệu",
        severity: "error",
      });
    }
  };

  const handleChange = (
    className: string,
    field: keyof ScoreRow,
    value: number
  ) => {
    setScores((prev) =>
      prev.map((s) => (s.className === className ? { ...s, [field]: value } : s))
    );
    setSaved(false);
  };

  // ================= Render =================
  const groupedByGrade: Record<string, ScoreRow[]> = {};
  scores.forEach((s) => {
    if (!groupedByGrade[s.grade]) groupedByGrade[s.grade] = [];
    groupedByGrade[s.grade].push(s);
  });
  const gradeKeys = Object.keys(groupedByGrade).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <Box display="flex" gap={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) =>
            setSelectedWeek(weeks.find((w) => w._id === e.target.value) || null)
          }
          sx={{ minWidth: 260 }}
          size="small"
        >
          {weeks.map((w) => {
            const has = weeksWithData.includes(w.weekNumber);
            return (
              <MenuItem
                key={w._id}
                value={w._id}
                style={has ? { fontWeight: 600, color: "green" } : {}}
              >
                Tuần {w.weekNumber} ({formatDateShort(w.startDate)} →{" "}
                {formatDateShort(w.endDate)}) {has ? "✓" : ""}
              </MenuItem>
            );
          })}
        </TextField>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Khối</InputLabel>
          <Select
            value={gradeFilter}
            label="Khối"
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="6">Khối 6</MenuItem>
            <MenuItem value="7">Khối 7</MenuItem>
            <MenuItem value="8">Khối 8</MenuItem>
            <MenuItem value="9">Khối 9</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2}>
          {!hasData && (
            <Button
              variant="contained"
              color="info"
              onClick={handleLoadTemp}
              disabled={!selectedWeek}
            >
              Load dữ liệu
            </Button>
          )}

          {hasData && needUpdate && (
            <Button
              variant="contained"
              color="warning"
              onClick={handleUpdate}
              disabled={!selectedWeek}
            >
              Cập nhật
            </Button>
          )}

          {hasData && !saved && (
            <Button
              variant="contained"
              color="success"
              onClick={handleSave}
              disabled={!scores.length}
            >
              Lưu
            </Button>
          )}

          {hasData && saved && !needUpdate && (
            <Button variant="outlined" disabled>
              Đã lưu
            </Button>
          )}

          {hasData && (
            <Button variant="outlined" onClick={handleExport}>
              Xuất Excel
            </Button>
          )}

          {hasData && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmDelete(true)}
            >
              Xoá tuần
            </Button>
          )}
        </Stack>
      </Box>

      {gradeKeys
        .filter((g) => gradeFilter === "all" || g === gradeFilter)
        .map((grade) => {
          const rows = groupedByGrade[grade]
            .slice()
            .sort((a, b) => a.className.localeCompare(b.className));
          return (
            <Box key={grade} mb={4}>
              <Typography variant="h6" gutterBottom>
                {grade === "undefined" ? "Khối chưa xác định" : `Khối ${grade}`} (
                {rows.length} lớp)
              </Typography>
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Học tập</TableCell>
                      <TableCell>Thưởng</TableCell>
                      <TableCell>Vi phạm</TableCell>
                      <TableCell>Vệ sinh</TableCell>
                      <TableCell>Chuyên cần</TableCell>
                      <TableCell>Xếp hàng</TableCell>
                      <TableCell>Tổng nề nếp</TableCell>
                      <TableCell>Tổng</TableCell>
                      <TableCell>Hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      let bg = {};
                      if (r.ranking === 1)
                        bg = { backgroundColor: "rgba(255,215,0,0.25)" };
                      else if (r.ranking === 2)
                        bg = { backgroundColor: "rgba(192,192,192,0.25)" };
                      else if (r.ranking === 3)
                        bg = { backgroundColor: "rgba(205,127,50,0.25)" };
                      return (
                        <TableRow key={r.className} sx={bg}>
                          <TableCell>{r.className}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ width: 70 }}
                              value={r.academicScore}
                              onChange={(e) =>
                                handleChange(
                                  r.className,
                                  "academicScore",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              sx={{ width: 70 }}
                              value={r.bonusScore}
                              onChange={(e) =>
                                handleChange(
                                  r.className,
                                  "bonusScore",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>{r.violationScore}</TableCell>
                          <TableCell>{r.hygieneScore}</TableCell>
                          <TableCell>{r.attendanceScore}</TableCell>
                          <TableCell>{r.lineUpScore}</TableCell>
                          <TableCell>{r.totalViolation}</TableCell>
                          <TableCell>{r.totalScore}</TableCell>
                          <TableCell>{r.ranking || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
              <Divider sx={{ my: 2 }} />
            </Box>
          );
        })}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Xác nhận xoá</DialogTitle>
        <DialogContent>
          Bạn có chắc chắn muốn xoá dữ liệu tuần {selectedWeek?.weekNumber}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Huỷ</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Xoá
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
