import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import api from "../api/api";

interface Result {
  _id: string;
  className: string;
  weekNumber: number;
  totalPoints: number;
  ranking: number;
}

export default function ViewFinalCompetitionResult() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // lấy danh sách tuần có dữ liệu
  const fetchWeeks = async () => {
    try {
      const res = await api.get<Result[]>("/api/class-weekly-scores");

      const weekNumbers: number[] = Array.from(
        new Set(res.data.map((item) => item.weekNumber))
      ).sort((a, b) => a - b);

      setWeeks(weekNumbers);
      if (weekNumbers.length > 0) setSelectedWeek(weekNumbers[0]);
    } catch (err) {
      console.error("Lỗi khi lấy tuần từ class-weekly-scores:", err);
    }
  };

  // lấy kết quả theo tuần
  const fetchResults = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get<Result[]>("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek },
      });

      // sắp xếp lớp theo tên
      const sorted = res.data.sort((a, b) => {
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
    fetchResults();
  }, [selectedWeek]);

  // nhóm kết quả theo khối lớp
  const groupedResults: Record<string, Result[]> = results.reduce(
    (acc: Record<string, Result[]>, r) => {
      const prefix = r.className.replace(/\d+$/, "");
      if (!acc[prefix]) acc[prefix] = [];
      acc[prefix].push(r);
      return acc;
    },
    {}
  );

  // màu theo hạng
  const getRowStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { backgroundColor: "#FFD700" }; // vàng
      case 2:
        return { backgroundColor: "#C0C0C0" }; // bạc
      case 3:
        return { backgroundColor: "#CD7F32" }; // đồng
      default:
        return {};
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Kết quả thi đua tuần
      </Typography>

      <Box mb={2}>
        <Typography variant="subtitle1">Chọn tuần:</Typography>
        <Select
          value={selectedWeek ?? ""}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        Object.keys(groupedResults).map((group) => (
          <Box key={group} mb={3}>
            <Typography variant="h6" gutterBottom>
              Khối {group}
            </Typography>
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng</TableCell>
                    <TableCell>Lớp</TableCell>
                    <TableCell>Điểm</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedResults[group].map((r) => (
                    <TableRow key={r._id} style={getRowStyle(r.ranking)}>
                      <TableCell>{r.ranking}</TableCell>
                      <TableCell>{r.className}</TableCell>
                      <TableCell>{r.totalPoints}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ))
      )}
    </Box>
  );
}
