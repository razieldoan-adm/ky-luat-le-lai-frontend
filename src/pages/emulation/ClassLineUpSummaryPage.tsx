import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  MenuItem,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
}

interface SummaryRow {
  id: number;
  className: string;
  count: number;
  total: number;
}

export default function ClassLineUpSummaryPage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(10); // hệ số điểm
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  // Load danh sách tuần
  useEffect(() => {
    api.get("/api/academic-weeks").then((res) => {
      setWeeks(res.data);
    });
  }, []);

  // Hàm load dữ liệu
  const handleLoadData = async () => {
    if (!selectedWeek) return;

    const res = await api.get("/api/class-lineup-summary", {
      params: { weekId: selectedWeek },
    });

    const data = res.data; // danh sách vi phạm trong tuần
    const grouped: Record<string, number> = {};

    data.forEach((item: any) => {
      if (!grouped[item.className]) grouped[item.className] = 0;
      grouped[item.className]++;
    });

    const formatted = Object.keys(grouped).map((className, index) => ({
      id: index + 1,
      className,
      count: grouped[className],
      total: grouped[className] * multiplier,
    }));

    setSummaries(formatted);
  };

  const handleSave = async () => {
    await api.post("/api/class-lineup-summary/save", { summaries });
    alert("Đã lưu thành công!");
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Tổng điểm xếp hạng các lớp theo tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          select
          label="Tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {weeks.map((week) => (
            <MenuItem key={week._id} value={week._id}>
              Tuần {week.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Hệ số điểm"
          type="number"
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          sx={{ width: 120 }}
        />

        <Button variant="contained" onClick={handleLoadData}>
          LOAD DỮ LIỆU
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          LƯU
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Số lần vi phạm</TableCell>
              <TableCell>Hệ số</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{multiplier}</TableCell>
                <TableCell>{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
