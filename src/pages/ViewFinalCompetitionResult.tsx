import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
} from "@mui/material";
import api from "../api/api";

interface CompetitionResult {
  classId: string;
  className: string;
  totalScore: number;
  rank: number;
}

export default function ViewFinalCompetitionResult() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Gọi API lấy danh sách tuần có kết quả thi đua
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/final-competition-results/weeks");
        setWeeks(res.data || []);
      } catch (err) {
        console.error("Lỗi load danh sách tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Gọi API lấy kết quả thi đua khi chọn tuần
  useEffect(() => {
    const fetchResults = async () => {
      if (!selectedWeek) return;
      setLoading(true);
      try {
        const res = await api.get("/api/final-competition-results", {
          params: { weekNumber: selectedWeek },
        });
        setResults(res.data || []);
      } catch (err) {
        console.error("Lỗi load kết quả thi đua:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedWeek]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Kết quả thi đua tuần
      </Typography>

      {/* Dropdown chọn tuần */}
      <Box mb={3} width={250}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          fullWidth
        >
          {weeks.map((week) => (
            <MenuItem key={week} value={week}>
              Tuần {week}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Bảng kết quả */}
      {loading ? (
        <CircularProgress />
      ) : (
        results.length > 0 && (
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hạng</TableCell>
                  <TableCell>Lớp</TableCell>
                  <TableCell align="right">Tổng điểm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.classId}>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell align="right">{row.totalScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )
      )}
    </Box>
  );
}
