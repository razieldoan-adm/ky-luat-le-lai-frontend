import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";
import api from "../api/api";

interface Result {
  className: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalNeNepscore: number;
  totalScore: number;
  rank: number;
}

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

const ViewFinalCompetitionResult = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      if (res.data.length > 0) setSelectedWeek(res.data[0]); // chọn tuần đầu tiên
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  // Lấy kết quả theo tuần
  const fetchResults = async (week: Week) => {
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: week.weekNumber },
      });

      // Sắp xếp lớp (ví dụ: 10A1, 10A2, 11A1, 12A1)
      const sorted = res.data.sort((a: any, b: any) => {
        const extractNumber = (s: string) => {
          const match = s.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const extractPrefix = (s: string) => s.replace(/\d+$/, "");

        const prefixA = extractPrefix(a.className);
        const prefixB = extractPrefix(b.className);

        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
        return extractNumber(a.className) - extractNumber(b.className);
      });

      setResults(sorted);
    } catch (err) {
      console.error("Lỗi khi lấy kết quả:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchResults(selectedWeek);
    }
  }, [selectedWeek]);

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold" gutterBottom align="center">
        KẾT QUẢ TỔNG HỢP THI ĐUA
      </Typography>

      {/* Chọn tuần */}
      <Box mb={2} display="flex" justifyContent="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value) || null;
            setSelectedWeek(week);
          }}
          sx={{ minWidth: 250 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Bảng kết quả */}
      <Paper sx={{ width: "100%", overflowX: "auto" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small" sx={{ border: "1px solid #000" }}>
            <TableHead>
              <TableRow>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  STT
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  Lớp
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  Học tập
                </TableCell>
                <TableCell
                  align="center"
                  colSpan={4}
                  sx={{ border: "1px solid #000" }}
                >
                  Nề nếp
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  Tổng điểm Nề nếp
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  Tổng
                </TableCell>
                <TableCell
                  align="center"
                  rowSpan={2}
                  sx={{ border: "1px solid #000" }}
                >
                  Xếp hạng
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>
                  Kỷ luật
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>
                  Vệ sinh
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>
                  Chuyên cần
                </TableCell>
                <TableCell align="center" sx={{ border: "1px solid #000" }}>
                  Xếp hàng
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {idx + 1}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.className}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.academicScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.disciplineScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.hygieneScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.attendanceScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.lineUpScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.totalNeNepscore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.totalScore}
                  </TableCell>
                  <TableCell align="center" sx={{ border: "1px solid #000" }}>
                    {r.rank}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default ViewFinalCompetitionResult;
