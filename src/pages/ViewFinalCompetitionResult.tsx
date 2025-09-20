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
import api from "../../api/api";

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
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách tuần
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("Lỗi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Lấy dữ liệu kết quả khi chọn tuần
  useEffect(() => {
    const fetchResults = async () => {
      if (!selectedWeek) return;
      setLoading(true);
      try {
        const res = await api.get("/api/final-competition-results", {
          params: { weekNumber: selectedWeek },
        });
        setResults(res.data);
      } catch (err) {
        console.error("Lỗi tải kết quả:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
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
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
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
