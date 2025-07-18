import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, MenuItem, Stack, Checkbox, Snackbar, Alert
} from '@mui/material';
import axios from 'axios';

interface ClassType {
  className: string;
  grade: string;
  scores: boolean[]; // 5 ngày trong tuần
}

const grades = ['6', '7', '8', '9'];
const days = ['T2', 'T3', 'T4', 'T5', 'T6'];

export default function ClassHygieneScorePage() {
  const [weekList, setWeekList] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [hygienePoint, setHygienePoint] = useState<number>(5); // ✅ mặc định, nhưng sẽ load từ settings

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setHygienePoint(res.data.disciplinePointDeduction?.hygiene || 5);
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await axios.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
      if (res.data.length > 0) {
        setSelectedWeek(res.data[0]);
        initializeData(res.data[0].weekNumber);
      }
    } catch (err) {
      console.error('Lỗi khi lấy weeks:', err);
    }
  };

  const initializeData = async (weekNumber: number) => {
    const initial: { [key: string]: ClassType[] } = {};
    grades.forEach(grade => {
      const classes: ClassType[] = [];
      for (let i = 1; i <= 10; i++) {
        classes.push({
          className: `${grade}A${i}`,
          grade,
          scores: [false, false, false, false, false], // ✅ mặc định chưa tick
        });
      }
      initial[grade] = classes;
    });

    try {
      const res = await axios.get('/api/class-hygiene-scores', { params: { weekNumber } });

      // ✅ Nếu tuần đã có dữ liệu thì ghi đè
      res.data.forEach((cls: any) => {
        const target = initial[cls.grade].find(c => c.className === cls.className);
        if (target) {
          target.scores = cls.scores || [false, false, false, false, false];
        }
      });
    } catch (err) {
      console.error('Lỗi khi load hygiene scores:', err);
    }

    setData(initial);
  };

  const handleCheck = (grade: string, classIdx: number, dayIdx: number) => {
    const updated = { ...data };
    updated[grade][classIdx].scores[dayIdx] = !updated[grade][classIdx].scores[dayIdx];
    setData(updated);
  };

  const calculateTotal = (scores: boolean[]) => scores.filter(s => s).length * hygienePoint;

  const handleSave = async () => {
    if (!selectedWeek) return;

    try {
      const payload = {
        weekNumber: selectedWeek.weekNumber,
        scores: grades.flatMap(g =>
          data[g].map(c => ({
            className: c.className,
            grade: c.grade,
            scores: c.scores, // ✅ lưu cả trạng thái checkbox
            totalScore: calculateTotal(c.scores)
          }))
        )
      };

      await axios.post('/api/class-hygiene-scores', payload);
      setSnackbar({ open: true, message: 'Đã lưu điểm vệ sinh thành công!', severity: 'success' });

    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      setSnackbar({ open: true, message: 'Lỗi khi lưu điểm.', severity: 'error' });
    }
  };

  const renderTable = (grade: string) => {
    if (!data[grade]) return null;

    return (
      <Paper key={grade} sx={{ p: 2, minWidth: 400 }}>
        <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
          Khối {grade}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Lớp</TableCell>
              {days.map(d => (
                <TableCell key={d} align="center">{d}</TableCell>
              ))}
              <TableCell align="center">Tổng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data[grade].map((cls, idx) => (
              <TableRow key={cls.className}>
                <TableCell sx={{ fontWeight: 'bold' }}>{cls.className}</TableCell>
                {cls.scores.map((checked, dayIdx) => (
                  <TableCell key={dayIdx} align="center">
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheck(grade, idx, dayIdx)}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">
                  {calculateTotal(cls.scores)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ''}
          onChange={(e) => {
            const w = weekList.find(w => w._id === e.target.value);
            setSelectedWeek(w || null);
            if (w) initializeData(w.weekNumber);
          }}
          sx={{ width: 180 }}
        >
          {weekList.map(w => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack
        direction="row"
        spacing={3}
        flexWrap="wrap"
        useFlexGap
      >
        {grades.map((grade) => (
          <Box key={grade} sx={{ flex: '1 1 400px' }}>
            {renderTable(grade)}
          </Box>
        ))}
      </Stack>

      <Button variant="contained" color="success" onClick={handleSave} sx={{ mt: 3 }}>
        💾 Lưu điểm vệ sinh
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as any}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
