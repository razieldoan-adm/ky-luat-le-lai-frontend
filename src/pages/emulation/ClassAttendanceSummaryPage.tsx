// src/pages/ClassUnexcusedSummaryPage.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from "@mui/material";
import api from "../../api/api";
import dayjs from "dayjs";
import useAcademicWeeks from "../../types/useAcademicWeeks";

interface SummaryRow {
  id: number;
  className: string;
  absences: number;
}

export default function ClassUnexcusedSummaryPage() {
  const { weeks, currentWeek } = useAcademicWeeks();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  useEffect(() => {
    if (currentWeek && weeks.length > 0) {
      setSelectedWeek(String(currentWeek));
    }
  }, [currentWeek, weeks]);

  const handleLoadData = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần!");
      const weekObj = weeks.find(w => String(w.weekNumber) === selectedWeek);
      if (!weekObj) return alert("Không tìm thấy tuần!");

      const res = await api.get("/api/class-attendance-summaries/weekly-summary", {
        params: { weekNumber: weekObj.weekNumber },
      });

      setSummaries(res.data.results || []);
    } catch (err) {
      console.error("❌ Lỗi load dữ liệu chuyên cần:", err);
      alert("Không thể tải dữ liệu nghỉ học không phép!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Tổng hợp nghỉ học không phép theo tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {weeks.map(w => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
              {dayjs(w.endDate).format("DD/MM")})
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={handleLoadData}>
          LOAD DỮ LIỆU
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Số lần nghỉ không phép</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.absences}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
