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
  Stack,
} from "@mui/material";
import api from "../api/api";

interface Result {
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
  Stack,
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
  _id?: string;
  id?: string;
  week?: number;
  weekNumber?: number;
  startDate: string;
  endDate: string;
}

const ViewFinalCompetitionResult = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // chuẩn hóa field tuần (id, _id, weekNumber, week)
  const normalizeWeek = (w: any): Week => ({
    _id: w._id || w.id || String(w.week) || String(w.weekNumber),
    weekNumber: w.weekNumber || w.week,
    startDate: w.startDate,
    endDate: w.endDate,
  });

  // Lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized = res.data.map((w: any) => normalizeWeek(w));
      setWeeks(normalized);
      if (normalized.length > 0) setSelectedWeek(normalized[0]);
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

      // Sắp xếp theo khối + số lớp
      const sorted = res.data.sort((a: any, b: any) => {
        const extractGrade = (s: string) => {
          const match = s.match(/^\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const extractNumber = (s: string) => {
          const match = s.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const gradeA = extractGrade(a.className);
        const gradeB = extractGrade(b.className);
        if (gradeA !== gradeB) return gradeA - gradeB;
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

  // Lọc theo khối
  const filteredResults = results.filter((r) => {
    if (gradeFilter === "all") return true;
    return r.className.startsWith(gradeFilter);
  });

  // Tính top 3 theo từng khối
  const getRankColor = (className: string, rank: number) => {
    if (rank === 1) return "#FFD700"; // vàng
    if (rank === 2) return "#C0C0C0"; // bạc
    if (rank === 3) return "#CD7F32"; // đồng
    return "inherit";
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold" gutterBottom align="center">
        KẾT QUẢ TỔNG HỢP THI ĐUA
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        mb={2}
        justifyContent="center"
        alignItems="center"
      >
        {/* Chọn tuần */}
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

        {/* Chọn khối */}
        <TextField
          select
          label="Chọn khối"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="6">Khối 6</MenuItem>
          <MenuItem value="7">Khối 7</MenuItem>
          <MenuItem value="8">Khối 8</MenuItem>
          <MenuItem value="9">Khối 9</MenuItem>
        </TextField>
      </Stack>

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
              {filteredResults.map((r, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor: getRankColor(r.className, r.rank),
                  }}
                >
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
  _id?: string;
  id?: string;
  week?: number;
  weekNumber?: number;
  startDate: string;
  endDate: string;
}

const ViewFinalCompetitionResult = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // chuẩn hóa field tuần (id, _id, weekNumber, week)
  const normalizeWeek = (w: any): Week => ({
    _id: w._id || w.id || String(w.week) || String(w.weekNumber),
    weekNumber: w.weekNumber || w.week,
    startDate: w.startDate,
    endDate: w.endDate,
  });

  // Lấy danh sách tuần
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const normalized = res.data.map((w: any) => normalizeWeek(w));
      setWeeks(normalized);
      if (normalized.length > 0) setSelectedWeek(normalized[0]);
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

      // Sắp xếp theo khối + số lớp
      const sorted = res.data.sort((a: any, b: any) => {
        const extractGrade = (s: string) => {
          const match = s.match(/^\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const extractNumber = (s: string) => {
          const match = s.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const gradeA = extractGrade(a.className);
        const gradeB = extractGrade(b.className);
        if (gradeA !== gradeB) return gradeA - gradeB;
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

  // Lọc theo khối
  const filteredResults = results.filter((r) => {
    if (gradeFilter === "all") return true;
    return r.className.startsWith(gradeFilter);
  });

  // Tính top 3 theo từng khối
  const getRankColor = (className: string, rank: number) => {
    if (rank === 1) return "#FFD700"; // vàng
    if (rank === 2) return "#C0C0C0"; // bạc
    if (rank === 3) return "#CD7F32"; // đồng
    return "inherit";
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight="bold" gutterBottom align="center">
        KẾT QUẢ TỔNG HỢP THI ĐUA
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        mb={2}
        justifyContent="center"
        alignItems="center"
      >
        {/* Chọn tuần */}
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

        {/* Chọn khối */}
        <TextField
          select
          label="Chọn khối"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="6">Khối 6</MenuItem>
          <MenuItem value="7">Khối 7</MenuItem>
          <MenuItem value="8">Khối 8</MenuItem>
          <MenuItem value="9">Khối 9</MenuItem>
        </TextField>
      </Stack>

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
              {filteredResults.map((r, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    backgroundColor: getRankColor(r.className, r.rank),
                  }}
                >
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
