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

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Score {
  _id: string;
  className: string;
  grade: string;
  academicScore: number; // SĐB
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore?: number;
  totalViolation?: number;
  totalRankScore?: number;
  rank?: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100); // mặc định
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) {
        setSelectedWeek((prev) => prev ?? res.data[0]);
      }
    } catch (err) {
      console.error("Lỗi khi lấy weeks:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      if (res.data?.disciplineMax) {
        setDisciplineMax(res.data.disciplineMax);
      }
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  // lấy điểm tuần hiện tại và chuẩn hoá dữ liệu
  const fetchScores = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      // map và chuẩn hoá grade (loại khoảng trắng, ép string)
      const list: Score[] = (res.data as any[]).map((s) => {
        const gradeNorm = (s.grade ?? "").toString().trim();
        return {
          ...s,
          grade: gradeNorm,
          bonusScore: s.bonusScore ?? 0,
          academicScore: Number(s.academicScore ?? 0),
          disciplineScore: Number(s.disciplineScore ?? s.violationScore ?? 0),
          hygieneScore: Number(s.hygieneScore ?? 0),
          attendanceScore: Number(s.attendanceScore ?? s.diligenceScore ?? 0),
          lineUpScore: Number(s.lineUpScore ?? s.lineUp ?? 0),
        } as Score;
      });

      // (tùy bạn) nếu muốn: chỉ lấy lớp có grade hợp lệ (ví dụ 6-9)
      // const allowedGrades = new Set(['6','7','8','9']);
      // const filtered = list.filter(s => allowedGrades.has(s.grade));

      // mình giữ tất cả lớp có grade (vì có thể bạn có nhiều khối)
      const withCalc = calculateTotals(list);
      const withRanks = assignRanksPerGrade(withCalc);
      setScores(withRanks);

      if (!Array.isArray(res.data) || res.data.length === 0) {
        setSnackbar({
          open: true,
          message: "Chưa có dữ liệu tuần này. Bấm 'Tải dữ liệu' để tính.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Lỗi khi load scores:", err);
    }
  };

  // tính các tổng
  const calculateTotals = (list: Score[]) => {
    return list.map((s) => {
      const totalViolation =
        disciplineMax -
        (Number(s.disciplineScore || 0) +
          Number(s.lineUpScore || 0) +
          Number(s.hygieneScore || 0) +
          Number(s.attendanceScore || 0));

      const totalRankScore =
        Number(s.academicScore || 0) + Number(s.bonusScore || 0) + totalViolation;

      return { ...s, totalViolation, totalRankScore };
    });
  };

  // gán hạng theo khối nhưng KHÔNG đổi thứ tự ban đầu trong mỗi khối
  const assignRanksPerGrade = (list: Score[]) => {
    const byGrade: Record<string, Score[]> = {};

    list.forEach((s) => {
      const g = (s.grade ?? "").toString().trim() || "Khác";
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(s);
    });

    // tính rank trong từng khối (sử dụng một bản sao để sắp xếp, sau đó gán rank vào list gốc)
    Object.keys(byGrade).forEach((g) => {
      // copy rồi sort theo totalRankScore (desc)
      const sorted = [...byGrade[g]].sort(
        (a: Score, b: Score) => (b.totalRankScore ?? 0) - (a.totalRankScore ?? 0)
      );
      // gán rank (dense rank, 1-based). Nếu muốn xử lý tie thì có thể điều chỉnh sau.
      sorted.forEach((s, idx) => {
        const target = list.find((x) => x._id === s._id);
        if (target) target.rank = idx + 1;
      });
    });

    return [...list]; // giữ nguyên thứ tự tổng thể (DB order)
  };

  // helper: grouped for render — trả về object { grade => array giữ nguyên thứ tự xuất hiện trong scores }
  const groupForRender = (list: Score[]) => {
    const grouped: Record<string, Score[]> = {};
    list.forEach((s) => {
      const g = (s.grade ?? "").toString().trim() || "Khác";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(s);
    });
    // return grades sorted numeric-first then others
    return grouped;
  };

  const handleBonusChange = (id: string, value: number | string) => {
    // value có thể là string từ input; chuyển sang number an toàn
    const n = typeof value === "string" ? (value === "" ? 0 : Number(value)) : Number(value);
    const safe = Number.isNaN(n) ? 0 : n;
    const updated = scores.map((s) => (s._id === id ? { ...s, bonusScore: safe } : s));
    const withCalc = calculateTotals(updated);
    const withRanks = assignRanksPerGrade(withCalc);
    setScores(withRanks);
  };

  const handleSave = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Chưa chọn tuần.", severity: "error" });
      return;
    }
    try {
      // gửi payload: tuần + danh sách điểm (bạn có thể điều chỉnh trường server cần)
      await api.post("/api/class-weekly-scores", {
        weekNumber: selectedWeek.weekNumber,
        scores: scores.map((s) => ({
          className: s.className,
          grade: s.grade,
          academicScore: s.academicScore,
          disciplineScore: s.disciplineScore,
          hygieneScore: s.hygieneScore,
          attendanceScore: s.attendanceScore,
          lineUpScore: s.lineUpScore,
          bonusScore: s.bonusScore,
          totalViolation: s.totalViolation,
          totalScore: s.totalRankScore,
          rank: s.rank,
        })),
      });

      setSnackbar({ open: true, message: "Đã lưu dữ liệu tuần thành công!", severity: "success" });
      // refresh để lấy id/ghi nhận từ server (nếu cần)
      if (selectedWeek) fetchScores();
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({ open: true, message: "Lưu thất bại.", severity: "error" });
    }
  };

  // style row: zebra + highlight top3
  const getRowStyle = (idxInGroup: number, rank?: number) => {
    const zebra = idxInGroup % 2 === 0 ? { backgroundColor: "#ffffff" } : { backgroundColor: "#f9f9f9" };
    if (rank === 1) return { ...zebra, backgroundColor: "#ffe082" };
    if (rank === 2) return { ...zebra, backgroundColor: "#b2ebf2" };
    if (rank === 3) return { ...zebra, backgroundColor: "#c8e6c9" };
    return zebra;
  };

  // render
  const grouped = groupForRender(scores);
  // sort grade keys numerically when possible, else lexicographically
  const gradeKeys = Object.keys(grouped).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    const aIsNum = !Number.isNaN(na);
    const bIsNum = !Number.isNaN(nb);
    if (aIsNum && bIsNum) return na - nb;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a.localeCompare(b);
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Điểm Thi Đua Tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
            setScores([]);
          }}
          sx={{ width: 150 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={fetchScores}>
          🔄 Tải dữ liệu
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          💾 Lưu
        </Button>
      </Stack>

      {gradeKeys.length === 0 ? (
        <Typography>⛔ Không có dữ liệu tuần này</Typography>
      ) : (
        gradeKeys.map((grade) => {
          const rows = grouped[grade];
          return (
            <Box key={grade} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1, mt: 1, fontWeight: "bold", color: "#1976d2" }}>
                Khối {grade}
              </Typography>

              <Table component={Paper}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">STT</TableCell>
                    <TableCell align="center">Lớp</TableCell>
                    <TableCell align="center">SĐB</TableCell>
                    <TableCell align="center">Kỷ luật</TableCell>
                    <TableCell align="center">Vệ sinh</TableCell>
                    <TableCell align="center">Chuyên cần</TableCell>
                    <TableCell align="center">Xếp hàng</TableCell>
                    <TableCell align="center">Điểm nề nếp</TableCell>
                    <TableCell align="center">Điểm thưởng</TableCell>
                    <TableCell align="center">Tổng xếp hạng</TableCell>
                    <TableCell align="center">Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((s, i) => (
                    <TableRow key={s._id} sx={getRowStyle(i, s.rank)}>
                      <TableCell align="center">{i + 1}</TableCell>
                      <TableCell align="center">{s.className}</TableCell>
                      <TableCell align="center">{s.academicScore}</TableCell>
                      <TableCell align="center">{s.disciplineScore}</TableCell>
                      <TableCell align="center">{s.hygieneScore}</TableCell>
                      <TableCell align="center">{s.attendanceScore}</TableCell>
                      <TableCell align="center">{s.lineUpScore}</TableCell>
                      <TableCell align="center">{s.totalViolation}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={s.bonusScore ?? 0}
                          onChange={(e) => handleBonusChange(s._id, e.target.value)}
                          sx={{ width: 80, "& input": { textAlign: "center" } }}
                        />
                      </TableCell>
                      <TableCell align="center">{s.totalRankScore}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {s.rank}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        })
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
