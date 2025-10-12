import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  Paper, Stack, Snackbar, Alert
} from '@mui/material';
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import api from '../../api/api';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface Class {
  _id: string;
  className: string;
  homeroomTeacher: string;
}

interface Violation {
  _id: string;
  className: string;
  penalty: number;
  weekNumber: number;
  time: string;
  handled: boolean;
  handlingMethod?: "GVCN" | "PGT xử lý" | null;
}

export default function ClassDisciplineTotalPage() {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [classList, setClassList] = useState<Class[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy tuần:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClassList(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy lớp:', err);
    }
  };

  // ✅ Check xem tuần đó đã có dữ liệu tổng vi phạm chưa
  const checkIfCalculated = async (weekNumber: number) => {
    try {
      const res = await api.get('/api/class-weekly-scores/weekly', {
        params: { weekNumber },
      });
      if (res.data && res.data.length > 0) {
        setIsCalculated(true);
        setSnackbar({ open: true, message: `Tuần ${weekNumber} đã có dữ liệu.`, severity: 'info' });
      } else {
        setIsCalculated(false);
      }
    } catch (err) {
      console.error('Lỗi khi check tuần:', err);
    }
  };

  const handleLoadData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần.", severity: "error" });
      return;
    }

    try {
      const res = await api.get("/api/violations/all/all-student");
      const data: Violation[] = res.data;

      const start = dayjs(selectedWeek.startDate).startOf("day");
      const end = dayjs(selectedWeek.endDate).endOf("day");

      const filtered = data.filter(v => {
        const t = dayjs(v.time);
        return (
          t.isAfter(start) &&
          t.isBefore(end) &&
          v.handled === true &&
          v.handlingMethod === "PGT xử lý"
        );
      });

      const newTableData = classList.map(cls => {
        const penalties = filtered
          .filter(v => v.className === cls.className)
          .map(v => v.penalty);

        const penaltiesString = penalties.join(", ");
        return {
          className: cls.className,
          homeroomTeacher: cls.homeroomTeacher,
          penalties,
          penaltiesString,
          total: penalties.reduce((sum, p) => sum + p, 0),
          count: penalties.length,
        };
      });

      setTableData(newTableData);
      setSnackbar({ open: true, message: "Đã load dữ liệu vi phạm.", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi load vi phạm:", err);
      setSnackbar({ open: true, message: "Lỗi khi tải dữ liệu.", severity: "error" });
    }
  };

  const handleSaveData = async () => {
    if (!selectedWeek) {
      setSnackbar({ open: true, message: "Vui lòng chọn tuần.", severity: "error" });
      return;
    }

    try {
      for (const row of tableData) {
        await api.post("/api/class-weekly-scores/update", {
          className: row.className,
          weekNumber: selectedWeek.weekNumber,
          violationScore: row.total, // ✅ chỉ lưu tổng
        });
      }

      setSnackbar({ open: true, message: "✅ Đã lưu điểm vi phạm vào bảng tổng tuần.", severity: "success" });
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      setSnackbar({ open: true, message: "❌ Lỗi khi lưu dữ liệu.", severity: "error" });
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Tổng điểm vi phạm các lớp theo tuần
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Tuần"
            select
            value={selectedWeek?._id || ''}
            onChange={(e) => {
              const w = weekList.find(w => w._id === e.target.value);
              setSelectedWeek(w || null);
              setTableData([]);
              setIsCalculated(false);
              if (w) checkIfCalculated(w.weekNumber);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">-- Chọn tuần --</MenuItem>
            {weekList.map(w => (
              <MenuItem key={w._id} value={w._id}>Tuần {w.weekNumber}</MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={handleLoadData}>Load dữ liệu</Button>
          <Button variant="contained" color="success" onClick={handleSaveData}>Lưu</Button>
        </Stack>

        {isCalculated && (
          <Typography color="green" sx={{ mt: 2 }}>
            Tuần này đã có dữ liệu tổng điểm.
          </Typography>
        )}
      </Paper>

      <Paper elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm vi phạm</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Số lỗi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length > 0 ? tableData.map((row, i) => (
              <TableRow key={row.className}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.penaltiesString}</TableCell>
                <TableCell>{row.total}</TableCell>
                <TableCell>{row.count}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} align="center">Chưa có dữ liệu.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
