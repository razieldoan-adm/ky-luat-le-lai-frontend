// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  classId: string;
  className: string;
  discipline: number;
  lineup: number;
  hygiene: number;
  attendance: number;
  reward: number;
  academic: number;
  totalDiscipline: number;
  total: number;
  rank: number;
  block: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);

  // 📌 Load danh sách tuần đã có dữ liệu
  useEffect(() => {
    api.get("/api/class-weekly-scores/weeks").then((res) => {
      setWeeksWithData(res.data);
    });
  }, []);

  // 📌 Load dữ liệu tuần
  const loadWeekData = async (week: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/class-weekly-scores?weekNumber=${week}`);
      setScores(res.data);
    } catch (err) {
      console.error("Load week error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 📌 Lưu dữ liệu tuần
  const handleSave = async () => {
    try {
      await api.post("/api/class-weekly-scores/save", { weekNumber, scores });
      alert("Đã lưu dữ liệu tuần");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  // 📌 Cập nhật dữ liệu từ các bảng gốc
  const handleUpdate = async () => {
    try {
      await api.post(`/api/class-weekly-scores/update/${weekNumber}`);
      await loadWeekData(weekNumber);
      alert("Đã cập nhật dữ liệu từ các bảng gốc");
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  // 📌 Xuất Excel
  const handleExport = async () => {
    try {
      const res = await api.get(
        `/api/class-weekly-scores/export/${weekNumber}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Week_${weekNumber}_Scores.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // 📌 Xoá dữ liệu tuần
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xoá dữ liệu tuần này?")) return;
    try {
      await api.delete(`/api/class-weekly-scores/${weekNumber}`);
      setScores([]);
      alert("Đã xoá dữ liệu tuần");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // 📌 Khi chọn tuần
  const handleWeekChange = (e: any) => {
    const week = Number(e.target.value);
    setWeekNumber(week);
    loadWeekData(week);
  };

  // 📌 Tô màu từng khối
  const getRowColor = (block: number) => {
    if (block === 1) return "#f1f8e9"; // xanh nhạt
    if (block === 2) return "#e3f2fd"; // xanh dương nhạt
    if (block === 3) return "#fce4ec"; // hồng nhạt
    return "white";
  };

  // 📌 Nhóm theo khối
  const groupedScores: { [key: number]: WeeklyScore[] } = {};
  scores.forEach((s) => {
    if (!groupedScores[s.block]) groupedScores[s.block] = [];
    groupedScores[s.block].push(s);
  });

  // 📌 Chỉnh sửa trực tiếp Reward & Academic
  const handleEdit = (
    classId: string,
    field: "reward" | "academic",
    value: number
  ) => {
    setScores((prev) =>
      prev.map((s) =>
        s.classId === classId
          ? {
              ...s,
              [field]: value,
              // tính lại điểm tổng kỷ luật và tổng
              totalDiscipline:
                s.discipline + s.lineup + s.hygiene + s.attendance * 5,
              total:
                (s.discipline + s.lineup + s.hygiene + s.attendance * 5) +
                (field === "reward" ? value : s.reward) -
                (field === "academic" ? value : s.academic),
            }
          : s
      )
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua theo tuần
      </Typography>

      {/* Chọn tuần */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select value={weekNumber} onChange={handleWeekChange} size="small">
          {[...Array(20)].map((_, i) => {
            const w = i + 1;
            const hasData = weeksWithData.includes(w);
            return (
              <MenuItem key={w} value={w}>
                Tuần {w} {hasData ? "✔" : ""}
              </MenuItem>
            );
          })}
        </Select>
        <Button variant="contained" onClick={handleSave} disabled={scores.length === 0}>
          Lưu
        </Button>
        <Button variant="outlined" onClick={handleUpdate}>
          Cập nhật
        </Button>
        <Button variant="outlined" onClick={handleExport} disabled={scores.length === 0}>
          Xuất Excel
        </Button>
        <Button variant="outlined" color="error" onClick={handleDelete}>
          Xoá tuần
        </Button>
      </Box>

      {/* Bảng dữ liệu */}
      {loading ? (
        <Typography>Đang tải...</Typography>
      ) : (
        Object.keys(groupedScores).map((block) => (
          <Box key={block} mb={4}>
            <Typography variant="h6" gutterBottom>
              Khối {block}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell>Kỷ luật</TableCell>
                    <TableCell>Xếp hàng</TableCell>
                    <TableCell>Vệ sinh</TableCell>
                    <TableCell>Chuyên cần</TableCell>
                    <TableCell>Thưởng</TableCell>
                    <TableCell>Học tập</TableCell>
                    <TableCell>Tổng kỷ luật</TableCell>
                    <TableCell>Tổng</TableCell>
                    <TableCell>Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedScores[Number(block)].map((s, idx) => (
                    <TableRow
                      key={idx}
                      style={{ backgroundColor: getRowColor(s.block) }}
                    >
                      <TableCell>{s.className}</TableCell>
                      <TableCell>{s.discipline}</TableCell>
                      <TableCell>{s.lineup}</TableCell>
                      <TableCell>{s.hygiene}</TableCell>
                      <TableCell>{s.attendance}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={s.reward}
                          onChange={(e) =>
                            handleEdit(s.classId, "reward", Number(e.target.value))
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={s.academic}
                          onChange={(e) =>
                            handleEdit(s.classId, "academic", Number(e.target.value))
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>{s.totalDiscipline}</TableCell>
                      <TableCell>{s.total}</TableCell>
                      <TableCell>{s.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
