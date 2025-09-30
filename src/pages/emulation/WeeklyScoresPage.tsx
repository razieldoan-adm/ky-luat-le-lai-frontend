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
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  discipline: number;
  attendance: number;
  hygiene: number;
  lineup: number;
  bonus: number;
  academic: number;
  totalDiscipline: number;
  total: number;
  rank: number;
  grade: string; // Khối (10, 11, 12)
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    api.get("/class-weekly-scores/weeks").then((res) => {
      setWeeksWithData(res.data || []);
    });
  }, []);

  // Load dữ liệu tuần khi chọn
  useEffect(() => {
    if (weekNumber === "") return;
    if (weeksWithData.includes(Number(weekNumber))) {
      // Nếu tuần đã có dữ liệu → load từ DB
      setLoading(true);
      api
        .get(`/class-weekly-scores/${weekNumber}`)
        .then((res) => {
          setScores(res.data || []);
          setHasData(true);
        })
        .catch(() => setHasData(false))
        .finally(() => setLoading(false));
    } else {
      // Tuần chưa có dữ liệu
      setScores([]);
      setHasData(false);
    }
  }, [weekNumber, weeksWithData]);

  // Load dữ liệu tạm (tính từ các bảng khác)
  const handleLoadData = () => {
    if (!weekNumber) return;
    setLoading(true);
    api
      .get(`/class-weekly-scores/temp?weekNumber=${weekNumber}`)
      .then((res) => {
        setScores(res.data || []);
        setHasData(false);
      })
      .finally(() => setLoading(false));
  };

  // Lưu dữ liệu lần đầu
  const handleSave = () => {
    if (!weekNumber) return;
    api
      .post("/class-weekly-scores/save", {
        weekNumber,
        scores,
      })
      .then(() => {
        alert("Đã lưu dữ liệu tuần!");
        setHasData(true);
        setWeeksWithData([...weeksWithData, Number(weekNumber)]);
      });
  };

  // Cập nhật dữ liệu từ các bảng gốc
  const handleUpdate = () => {
    if (!weekNumber) return;
    api
      .post(`/class-weekly-scores/update/${weekNumber}`)
      .then((res) => {
        setScores(res.data || []);
        alert("Đã cập nhật dữ liệu từ các bảng gốc!");
      });
  };

  // Xuất Excel
  const handleExport = () => {
    if (!weekNumber) return;
    window.open(
      `${process.env.REACT_APP_API_URL}/api/class-weekly-scores/export/${weekNumber}`,
      "_blank"
    );
  };

  // Xoá tuần
  const handleDelete = () => {
    if (!weekNumber) return;
    if (!window.confirm("Bạn có chắc muốn xoá tuần này?")) return;
    api.delete(`/class-weekly-scores/${weekNumber}`).then(() => {
      alert("Đã xoá dữ liệu tuần!");
      setScores([]);
      setHasData(false);
      setWeeksWithData(weeksWithData.filter((w) => w !== Number(weekNumber)));
    });
  };

  // Chỉnh sửa trực tiếp điểm thưởng và học tập
  const handleCellChange = (
    index: number,
    field: "bonus" | "academic",
    value: number
  ) => {
    const updated = [...scores];
    (updated[index] as any)[field] = value;
    // Tính lại total
    updated[index].total = updated[index].totalDiscipline + updated[index].bonus + updated[index].academic;
    setScores(updated);
  };

  // Tách theo khối
  const groupedScores: Record<string, WeeklyScore[]> = {};
  scores.forEach((s) => {
    if (!groupedScores[s.grade]) groupedScores[s.grade] = [];
    groupedScores[s.grade].push(s);
  });

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      {/* Chọn tuần */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          value={weekNumber}
          onChange={(e) => setWeekNumber(e.target.value as number)}
          displayEmpty
          size="small"
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {[...Array(52)].map((_, i) => (
            <MenuItem
              key={i + 1}
              value={i + 1}
              style={{
                fontWeight: weeksWithData.includes(i + 1) ? "bold" : "normal",
                color: weeksWithData.includes(i + 1) ? "green" : "black",
              }}
            >
              Tuần {i + 1}
            </MenuItem>
          ))}
        </Select>

        <Button
          variant="contained"
          onClick={handleLoadData}
          disabled={!weekNumber || hasData}
        >
          Load dữ liệu
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={!weekNumber || hasData}
        >
          Lưu
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleUpdate}
          disabled={!weekNumber}
        >
          Cập nhật
        </Button>
        <Button
          variant="contained"
          color="info"
          onClick={handleExport}
          disabled={!weekNumber || !hasData}
        >
          Xuất Excel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={!weekNumber || !hasData}
        >
          Xoá tuần
        </Button>
      </Box>

      {/* Bảng dữ liệu */}
      {loading ? (
        <CircularProgress />
      ) : scores.length > 0 ? (
        Object.keys(groupedScores).map((grade) => (
          <Box key={grade} mb={3}>
            <Typography variant="h6" gutterBottom color="primary">
              Khối {grade}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell>Kỷ luật</TableCell>
                    <TableCell>Chuyên cần</TableCell>
                    <TableCell>Vệ sinh</TableCell>
                    <TableCell>Xếp hàng</TableCell>
                    <TableCell>Điểm kỷ luật tổng</TableCell>
                    <TableCell>Điểm thưởng</TableCell>
                    <TableCell>Điểm học tập</TableCell>
                    <TableCell>Điểm tổng</TableCell>
                    <TableCell>Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedScores[grade].map((row, idx) => (
                    <TableRow key={row.className}>
                      <TableCell>{row.className}</TableCell>
                      <TableCell>{row.discipline}</TableCell>
                      <TableCell>{row.attendance}</TableCell>
                      <TableCell>{row.hygiene}</TableCell>
                      <TableCell>{row.lineup}</TableCell>
                      <TableCell>{row.totalDiscipline}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={row.bonus}
                          onChange={(e) =>
                            handleCellChange(
                              idx,
                              "bonus",
                              Number(e.target.value)
                            )
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={row.academic}
                          onChange={(e) =>
                            handleCellChange(
                              idx,
                              "academic",
                              Number(e.target.value)
                            )
                          }
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      ) : (
        weekNumber && (
          <Typography>Chưa có dữ liệu cho tuần này. Vui lòng Load dữ liệu.</Typography>
        )
      )}
    </Box>
  );
}
