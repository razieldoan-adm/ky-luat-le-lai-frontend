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
  TextField,
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

const WeeklyScoresPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
  const [isTempLoaded, setIsTempLoaded] = useState(false);

  // lấy danh sách tuần đã có dữ liệu
  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get<number[]>("/api/class-weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Load weeks error:", err);
    }
  };

  // load dữ liệu tạm hoặc đã lưu
  const fetchScores = async (weekNumber: number, isTemp = false) => {
    setLoading(true);
    try {
      let res;
      if (!isTemp && weeksWithData.includes(weekNumber)) {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores?weekNumber=${weekNumber}`
        );
        setScores(res.data || []);
        setIsTempLoaded(false);
      } else {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores/temp`,
          { params: { weekNumber } }
        );
        setScores(res.data || []);
        setIsTempLoaded(true);
      }
    } catch (err) {
      console.error("Load scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  // lưu dữ liệu tuần
  const handleSave = async () => {
    if (!week || scores.length === 0) return;
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: week,
        scores,
      });
      alert("Đã lưu dữ liệu tuần thành công!");
      fetchWeeksWithData();
      setIsTempLoaded(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu.");
    }
  };

  // cập nhật lại dữ liệu tuần từ các bảng gốc
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

  // xuất excel
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

  // xoá dữ liệu tuần
  const handleDelete = async () => {
    if (!week) return;
    if (!window.confirm(`Bạn có chắc muốn xoá dữ liệu tuần ${week}?`)) return;
    try {
      await api.delete(`/api/class-weekly-scores/${week}`);
      alert("Đã xoá dữ liệu tuần!");
      setScores([]);
      fetchWeeksWithData();
      setIsTempLoaded(false);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Lỗi khi xoá dữ liệu.");
    }
  };

  // nhập trực tiếp điểm
  const handleScoreChange = (
    index: number,
    field: "bonusScore" | "academicScore",
    value: number
  ) => {
    const updated = [...scores];
    updated[index] = { ...updated[index], [field]: value };
    setScores(updated);
  };

  useEffect(() => {
    fetchWeeksWithData();
  }, []);

  useEffect(() => {
    if (week !== "" && weeksWithData.includes(Number(week))) {
      // nếu tuần đã có dữ liệu thì load luôn
      fetchScores(Number(week));
    } else {
      setScores([]);
      setIsTempLoaded(false);
    }
  }, [week, weeksWithData]);

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
                sx={hasData ? { color: "green" } : {}}
              >
                Tuần {w} {hasData ? "(Đã có dữ liệu)" : ""}
              </MenuItem>
            );
          })}
        </Select>

        {!weeksWithData.includes(Number(week)) && week !== "" && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => fetchScores(Number(week), true)}
          >
            Load dữ liệu
          </Button>
        )}

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={!isTempLoaded}
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Khối</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Vi phạm</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Tổng VP</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((row, idx) => (
                <TableRow key={row.className}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.attendanceScore}</TableCell>
                  <TableCell>{row.hygieneScore}</TableCell>
                  <TableCell>{row.lineUpScore}</TableCell>
                  <TableCell>{row.violationScore}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.academicScore}
                      onChange={(e) =>
                        handleScoreChange(idx, "academicScore", Number(e.target.value))
                      }
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.bonusScore}
                      onChange={(e) =>
                        handleScoreChange(idx, "bonusScore", Number(e.target.value))
                      }
                      sx={{ width: 70 }}
                    />
                  </TableCell>
                  <TableCell>{row.totalViolation}</TableCell>
                  <TableCell>{row.totalScore}</TableCell>
                  <TableCell>{row.ranking}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        week !== "" && <Typography>Chưa có dữ liệu tuần này.</Typography>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
