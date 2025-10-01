import { useEffect, useState } from "react";
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

interface ScoreRow {
  id: string;
  className: string;
  grade: number;
  discipline: number;
  ranking: number;
  hygiene: number;
  diligence: number;
  reward: number;
  study: number;
  totalViolation: number;
  totalScore: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [disciplineMax, setDisciplineMax] = useState(100);
  const [dirty, setDirty] = useState(false);

  // Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    api.get("/weekly-scores/weeks").then((res) => {
      setWeeks(res.data || []);
    });
    // lấy disciplineMax từ settings
    api.get("/settings").then((res) => {
      if (res.data?.disciplineMax) {
        setDisciplineMax(res.data.disciplineMax);
      }
    });
  }, []);

  // Load dữ liệu tuần
  const loadData = async (weekNumber: number) => {
    setLoading(true);
    try {
      let res = await api.get(`/weekly-scores?weekNumber=${weekNumber}`);
      let data = res.data;
      if (!data || data.length === 0) {
        res = await api.get(`/weekly-scores/temp?weekNumber=${weekNumber}`);
        data = res.data;
      }
      setRows(recalculate(data));
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  // Hàm tính toán lại totalViolation, totalScore và ranking
  const recalculate = (data: ScoreRow[]): ScoreRow[] => {
    // nhóm theo grade
    const grouped: { [grade: number]: ScoreRow[] } = {};
    data.forEach((row) => {
      const totalViolation =
        disciplineMax -
        (row.discipline + row.ranking + row.hygiene + row.diligence * 5);
      const totalScore = totalViolation + row.reward - row.study;
      row.totalViolation = totalViolation;
      row.totalScore = totalScore;
      if (!grouped[row.grade]) grouped[row.grade] = [];
      grouped[row.grade].push(row);
    });
    // xếp hạng trong từng grade
    Object.values(grouped).forEach((group) => {
      group
        .sort((a, b) => b.totalScore - a.totalScore)
        .forEach((row, index) => {
          row.ranking = index + 1;
        });
    });
    return [...data];
  };

  // Xử lý nhập điểm trực tiếp
  const handleInputChange = (
    id: string,
    field: "reward" | "study",
    value: number
  ) => {
    const updated = rows.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setRows(recalculate(updated));
    setDirty(true);
  };

  // Cập nhật dữ liệu lên server
  const handleUpdate = async () => {
    if (selectedWeek === "") return;
    setLoading(true);
    try {
      await api.post(`/weekly-scores/update/${selectedWeek}`, rows);
      setDirty(false);
      alert("Cập nhật thành công!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua hàng tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          size="small"
          value={selectedWeek}
          onChange={(e) => {
            const week = e.target.value as number;
            setSelectedWeek(week);
            loadData(week);
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w} {weeks.includes(w) ? "(Đã có dữ liệu)" : "(Mới)"}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          onClick={handleUpdate}
          disabled={!dirty || loading}
        >
          Cập nhật
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : rows.length === 0 ? (
        <Typography>Chưa có dữ liệu</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Khối</TableCell>
                <TableCell>Kỷ luật</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Tổng kỷ luật</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Thứ hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.discipline}</TableCell>
                  <TableCell>{row.ranking}</TableCell>
                  <TableCell>{row.hygiene}</TableCell>
                  <TableCell>{row.diligence}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.reward}
                      onChange={(e) =>
                        handleInputChange(
                          row.id,
                          "reward",
                          Number(e.target.value)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.study}
                      onChange={(e) =>
                        handleInputChange(
                          row.id,
                          "study",
                          Number(e.target.value)
                        )
                      }
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
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
