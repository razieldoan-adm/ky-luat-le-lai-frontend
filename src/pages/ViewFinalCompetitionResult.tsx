import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import api from "../api/api";

interface Week {
  _id?: string;
  id?: string;
  weekNumber: number;
  name?: string;
}

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

const ViewFinalCompetitionResult = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKhoi, setSelectedKhoi] = useState<string>("all");

  // lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const formatted = res.data.map((w: any) => ({
        _id: w._id || w.id || w.week || w.weekNumber,
        weekNumber: w.weekNumber || w.week || 0,
        name: w.name || `Tuần ${w.weekNumber || w.week}`,
      }));
      setWeeks(formatted);
      if (formatted.length > 0) setSelectedWeek(formatted[0]);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  // lấy kết quả theo tuần
  const fetchResults = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber: selectedWeek.weekNumber },
      });

      // sắp xếp lớp
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
    fetchResults();
  }, [selectedWeek]);

  // lọc theo khối
  const filteredResults =
    selectedKhoi === "all"
      ? results
      : results.filter((r) => r.className.startsWith(selectedKhoi));

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Kết quả thi đua tổng hợp
      </Typography>

      {/* chọn tuần */}
      <FormControl sx={{ minWidth: 200, mr: 2 }}>
        <InputLabel>Chọn tuần</InputLabel>
        <Select
          value={selectedWeek?._id || ""}
          onChange={(e) => {
            const week = weeks.find((w) => w._id === e.target.value);
            setSelectedWeek(week || null);
          }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              {w.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* chọn khối */}
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Lọc theo khối</InputLabel>
        <Select
          value={selectedKhoi}
          onChange={(e) => setSelectedKhoi(e.target.value)}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="10">Khối 10</MenuItem>
          <MenuItem value="11">Khối 11</MenuItem>
          <MenuItem value="12">Khối 12</MenuItem>
        </Select>
      </FormControl>

      {/* bảng kết quả */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Table size="small" sx={{ border: "1px solid #000", mt: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                STT
              </TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                Lớp
              </TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                Học tập
              </TableCell>
              <TableCell align="center" colSpan={4} sx={{ border: "1px solid #000" }}>
                Nề nếp
              </TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                Tổng điểm Nề nếp
              </TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
                Tổng
              </TableCell>
              <TableCell align="center" rowSpan={2} sx={{ border: "1px solid #000" }}>
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
            {filteredResults.map((r, idx) => {
              let bgColor = "inherit";
              if (r.rank === 1) bgColor = "#ffd700"; // vàng
              else if (r.rank === 2) bgColor = "#c0c0c0"; // bạc
              else if (r.rank === 3) bgColor = "#cd7f32"; // đồng

              return (
                <TableRow key={idx} sx={{ backgroundColor: bgColor }}>
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
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default ViewFinalCompetitionResult;
