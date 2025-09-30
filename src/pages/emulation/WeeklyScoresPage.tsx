import React, { useEffect, useState } from "react";
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
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScoreRow {
  className: string;
  grade: string;
  weekNumber: number;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

const getRowStyle = (ranking: number) => {
  if (ranking === 1) return { backgroundColor: "#fff59d" }; // vàng nhạt
  if (ranking === 2) return { backgroundColor: "#b2ebf2" }; // xanh nhạt
  if (ranking === 3) return { backgroundColor: "#c8e6c9" }; // xanh lá nhạt
  return {};
};

const WeeklyScoresPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);

  // Lấy danh sách tuần đã có dữ liệu
  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get<number[]>("/api/class-weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Load weeks error:", err);
    }
  };

  // Load dữ liệu điểm cho tuần
  const fetchScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      let res;
      if (weeksWithData.includes(weekNumber)) {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores?weekNumber=${weekNumber}`
        );
      } else {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores/temp?weekNumber=${weekNumber}`
        );
      }
      setScores(res.data || []);
    } catch (err) {
      console.error("Load scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lưu dữ liệu tuần
  const handleSave = async () => {
    if (!week || scores.length === 0) return;
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: week,
        scores,
      });
      alert("Đã lưu dữ liệu tuần thành công!");
      fetchWeeksWithData();
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu.");
    }
  };

  // Cập nhật lại dữ liệu tuần từ bảng gốc
  const handleUpdate = async () => {
    if (!week) return;
    try {
      const res = await api.post<WeeklyScoreRow[]>(
        `/api/class-weekly-scores/update/${week}`
      );
      setScores(res.data || []);
      alert("Đã cập nhật dữ liệu tuần!");
    } catch (err) {
      console.error("Update error:", err);
      alert("Lỗi khi cập nhật dữ liệu.");
    }
  };

  // Xuất Excel
  const handleExport = async () => {
    if (!week) return;
    try {
      const res = await api.get(`/api/class-weekly-scores/export/${week}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly_scores_${week}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export error:", err);
      alert("Lỗi khi xuất Excel.");
    }
  };

  // Xoá dữ liệu tuần
  const handleDelete = async () => {
    if (!week) return;
    if (!window.confirm(`Bạn có chắc muốn xoá dữ liệu tuần ${week}?`)) return;
    try {
      await api.delete(`/api/class-weekly-scores/${week}`);
      alert("Đã xoá dữ liệu tuần!");
      setScores([]);
      fetchWeeksWithData();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Lỗi khi xoá dữ liệu.");
    }
  };

  useEffect(() => {
    fetchWeeksWithData();
  }, []);

  useEffect(() => {
    if (week !== "") {
      fetchScores(Number(week));
    }
  }, [week, weeksWithData]);

  // Group theo khối
  const groupedByGrade: Record<string, WeeklyScoreRow[]> = scores.reduce(
    (acc, row) => {
      if (!acc[row.grade]) acc[row.grade] = [];
      acc[row.grade].push(row);
      return acc;
    },
    {} as Record<string, WeeklyScoreRow[]>
  );

  const renderTable = (grade: string, rows: WeeklyScoreRow[]) => (
    <Box key={grade} mb={4}>
      <Typography variant="h6" gutterBottom>
        Khối {grade}
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm chuyên cần</TableCell>
              <TableCell>Điểm vệ sinh</TableCell>
              <TableCell>Điểm xếp hàng</TableCell>
              <TableCell>Điểm vi phạm</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Tổng vi phạm</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .sort((a, b) => a.className.localeCompare(b.className))
              .map((row) => (
                <TableRow
                  key={row.className}
                  sx={getRowStyle(row.ranking)}
                >
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.attendanceScore}</TableCell>
                  <TableCell>{row.hygieneScore}</TableCell>
                  <TableCell>{row.lineUpScore}</TableCell>
                  <TableCell>{row.violationScore}</TableCell>
                  <TableCell>{row.academicScore}</TableCell>
                  <TableCell>{row.bonusScore}</TableCell>
                  <TableCell>{row.totalViolation}</TableCell>
                  <TableCell>{row.totalScore}</TableCell>
                  <TableCell>{row.ranking}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          displayEmpty
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {[...Array(20).keys()].map((i) => {
            const w = i + 1;
            const hasData = weeksWithData.includes(w);
            return (
              <MenuItem
                key={w}
                value={w}
                disabled={hasData}
                sx={hasData ? { color: "gray" } : {}}
              >
                Tuần {w} {hasData ? "(Đã có dữ liệu)" : ""}
              </MenuItem>
            );
          })}
        </Select>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!week || scores.length === 0}
        >
          Lưu
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleUpdate}
          disabled={!week}
        >
          Cập nhật
        </Button>
        <Button variant="outlined" onClick={handleExport} disabled={!week}>
          Xuất Excel
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          disabled={!week}
        >
          Xoá tuần
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : scores.length > 0 ? (
        Object.keys(groupedByGrade)
          .sort()
          .map((grade) => renderTable(grade, groupedByGrade[grade]))
      ) : (
        week !== "" && <Typography>Không có dữ liệu tuần này.</Typography>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
