import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";
import * as XLSX from "xlsx";

interface Week {
  id: string;
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ClassScore {
  className: string;
  totalScore: number;
  rank: number;
  grade: number; // khối lớp
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [gradeFilter, setGradeFilter] = useState<"all" | 6 | 7 | 8 | 9>("all");

  // fetch danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized = (res.data || []).map((w: any, idx: number): Week => ({
        id: w._id || w.id || String(idx),
        weekNumber: w.weekNumber || w.week || idx + 1,
        startDate: w.startDate || w.start || "",
        endDate: w.endDate || w.end || "",
      }));
      setWeeks(normalized);
    } catch (err) {
      console.error("Lỗi khi load tuần:", err);
    }
  };

  // fetch điểm theo tuần
  const fetchScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get("/api/class-lineup-summaries", {
        params: { weekNumber },
      });

      let data: ClassScore[] = (res.data || []).map((item: any) => {
        const className: string = item.className || "Không rõ";
        let grade = 0;
        if (className.startsWith("6")) grade = 6;
        else if (className.startsWith("7")) grade = 7;
        else if (className.startsWith("8")) grade = 8;
        else if (className.startsWith("9")) grade = 9;

        return {
          className,
          totalScore: item.totalScore || 0,
          rank: 0,
          grade,
        };
      });

      // Xếp hạng riêng từng khối (dùng rank), nhưng giữ nguyên sort theo className để hiển thị
      [6, 7, 8, 9].forEach((g) => {
        const group: ClassScore[] = data.filter((x) => x.grade === g);
        group.sort((a, b) => b.totalScore - a.totalScore);
        group.forEach((item, idx) => {
          item.rank = idx + 1;
        });
      });

      // Sort lại theo tên lớp
      data.sort((a, b) => a.className.localeCompare(b.className, "vi", { numeric: true }));

      setScores(data);
    } catch (err) {
      console.error("Lỗi khi load điểm:", err);
      setSnackbar({ open: true, message: "Lỗi khi tải dữ liệu điểm", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // load dữ liệu tuần mới
  const handleLoadData = async () => {
    if (!selectedWeek) return;
    const week = weeks.find((w) => w.id === selectedWeek);
    if (!week) return;

    try {
      await fetchScores(week.weekNumber);
      await api.post("/api/class-lineup-summaries/load", { weekNumber: week.weekNumber });
      setSnackbar({ open: true, message: "Đã load dữ liệu tuần mới", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
      setSnackbar({ open: true, message: "Không thể load dữ liệu", severity: "error" });
    }
  };

  // cập nhật lại dữ liệu tuần
  const handleUpdateData = async () => {
    if (!selectedWeek) return;
    const week = weeks.find((w) => w.id === selectedWeek);
    if (!week) return;

    try {
      await fetchScores(week.weekNumber);
      await api.put("/api/class-lineup-summaries/update", { weekNumber: week.weekNumber });
      setSnackbar({ open: true, message: "Đã cập nhật dữ liệu tuần", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi cập nhật dữ liệu:", err);
      setSnackbar({ open: true, message: "Không thể cập nhật dữ liệu", severity: "error" });
    }
  };

  // xuất excel
  const handleExportExcel = () => {
    const filtered = gradeFilter === "all" ? scores : scores.filter((s) => s.grade === gradeFilter);
    const worksheet = XLSX.utils.json_to_sheet(filtered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WeeklyScores");
    XLSX.writeFile(workbook, `WeeklyScores_Week${selectedWeek}.xlsx`);
  };

  // khi chọn tuần → tự động load dữ liệu nếu đã tồn tại
  useEffect(() => {
    if (!selectedWeek) return;
    const week = weeks.find((w) => w.id === selectedWeek);
    if (!week) return;

    const checkData = async () => {
      try {
        const res = await api.get("/api/class-lineup-summaries/check", {
          params: { weekNumber: week.weekNumber },
        });

        if (res.data?.exists) {
          await fetchScores(week.weekNumber); // tự động load dữ liệu
        } else {
          setScores([]);
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra dữ liệu tuần:", err);
      }
    };

    checkData();
  }, [selectedWeek, weeks]);

  useEffect(() => {
    fetchWeeks();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Điểm thi đua hàng tuần
      </Typography>

      {/* chọn tuần */}
      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek || ""}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              Tuần {w.weekNumber} {w.startDate && w.endDate ? `(${w.startDate} - ${w.endDate})` : ""}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Chọn khối"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value as any)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value={6}>Khối 6</MenuItem>
          <MenuItem value={7}>Khối 7</MenuItem>
          <MenuItem value={8}>Khối 8</MenuItem>
          <MenuItem value={9}>Khối 9</MenuItem>
        </TextField>
      </Stack>

      {/* nút thao tác */}
      <Stack direction="row" spacing={2} mt={1} mb={2}>
        {!scores.length && selectedWeek && (
          <Button variant="contained" color="primary" onClick={handleLoadData} disabled={loading}>
            Load dữ liệu
          </Button>
        )}
        {scores.length > 0 && (
          <>
            <Button variant="contained" color="secondary" onClick={handleUpdateData} disabled={loading}>
              Cập nhật
            </Button>
            <Button variant="outlined" onClick={handleExportExcel}>
              Xuất Excel
            </Button>
          </>
        )}
      </Stack>

      {/* bảng điểm */}
      {scores.length > 0 ? (
        [6, 7, 8, 9].map((g) => {
          if (gradeFilter !== "all" && gradeFilter !== g) return null;
          const groupScores = scores.filter((s) => s.grade === g);
          if (groupScores.length === 0) return null;

          return (
            <Paper key={g} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" mb={1}>
                Khối {g}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell align="right">Điểm</TableCell>
                    <TableCell align="right">Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupScores.map((row) => (
                    <TableRow
                      key={row.className}
                      sx={{
                        backgroundColor:
                          row.rank === 1
                            ? "#FFD70055" // vàng nhạt
                            : row.rank === 2
                            ? "#C0C0C055" // bạc nhạt
                            : row.rank === 3
                            ? "#CD7F3255" // đồng nhạt
                            : "inherit",
                      }}
                    >
                      <TableCell>{row.className}</TableCell>
                      <TableCell align="right">{row.totalScore}</TableCell>
                      <TableCell align="right">{row.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          );
        })
      ) : (
        selectedWeek && <Typography>Chưa có dữ liệu tuần này.</Typography>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
