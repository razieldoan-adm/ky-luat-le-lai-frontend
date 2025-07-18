import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, TextField, Button, MenuItem, Stack, Snackbar, Alert, Backdrop, CircularProgress
} from '@mui/material';

interface ClassType {
  className: string;
  grade: string;
  scores: number[]; // 10 ô nhập điểm
  total?: number;
}

const grades = ['6', '7', '8', '9'];
const colLabels = ['T6 Sáng', 'T6 Chiều',
  'T2 Sáng', 'T2 Chiều',
  'T3 Sáng', 'T3 Chiều',
  'T4 Sáng', 'T4 Chiều',
  'T5 Sáng', 'T5 Chiều'];

export default function ClassAttendanceSummaryPage() {
  const [weekList, setWeekList] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/academic-weeks/study-weeks');
      setWeekList(res.data);
      const initialWeek = res.data[0];
      setSelectedWeek(initialWeek);
      if (initialWeek) await initializeData(initialWeek.weekNumber);
    } catch (err) {
      console.error('Error fetching weeks:', err);
    }
    setLoading(false);
  };

  const initializeData = async (weekNumber: number) => {
    setLoading(true);
    const initial: { [key: string]: ClassType[] } = {};
    grades.forEach(grade => {
      const classes: ClassType[] = [];
      for (let i = 1; i <= 10; i++) {
        classes.push({
          className: `${grade}A${i}`,
          grade,
          scores: Array(10).fill(0),
        });
      }
      initial[grade] = classes;
    });

    try {
      const res = await axios.get('/api/class-attendance-summaries', { params: { weekNumber } });
      res.data.forEach((cls: any) => {
        const target = initial[cls.grade].find(c => c.className === cls.className);
        if (target) {
          target.scores = cls.data || Array(10).fill(0);
          target.total = cls.total || 0;
        }
      });
    } catch (err) {
      console.error('Error loading summaries:', err);
    }

    setData(initial);
    setLoading(false);
  };

  const handleChange = (grade: string, classIdx: number, scoreIdx: number, value: string) => {
    const updated = { ...data };
    updated[grade][classIdx].scores[scoreIdx] = Number(value);
    setData(updated);
  };

  const calcTotals = () => {
    const updated = { ...data };
    grades.forEach(grade => {
      updated[grade].forEach(cls => {
        cls.total = cls.scores.reduce((sum, v) => sum + (v || 0), 0);
      });
    });
    setData(updated);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const payload = {
        weekNumber: selectedWeek.weekNumber,
        summaries: grades.flatMap(g =>
          data[g].map(c => ({
            className: c.className,
            grade: c.grade,
            data: c.scores,
            total: c.total || 0,
          }))
        )
      };

      await axios.post('/api/class-attendance-summaries', payload);
      setSnackbar({ open: true, message: 'Đã lưu điểm chuyên cần thành công!', severity: 'success' });
    } catch (err) {
      console.error('Save error:', err);
      setSnackbar({ open: true, message: 'Lỗi khi lưu.', severity: 'error' });
    }
    setLoading(false);
  };

  const handleWeekChange = (e: any) => {
    const w = weekList.find(w => w._id === e.target.value);
    setSelectedWeek(w || null);
    if (w) initializeData(w.weekNumber);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📝 Nhập điểm chuyên cần theo tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek?._id || ''}
          onChange={handleWeekChange}
          sx={{ width: 180 }}
        >
          {weekList.map(w => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {grades.map((grade) => (
        <Box key={grade} sx={{ my: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            Khối {grade}
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Lớp</th>
                  {colLabels.map(label => (
                    <th key={label} style={{ border: '1px solid #ccc', padding: '4px' }}>{label}</th>
                  ))}
                  <th style={{ border: '1px solid #ccc', padding: '4px' }}>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {data[grade]?.map((cls, idx) => (
                  <tr key={cls.className}>
                    <td style={{ border: '1px solid #ccc', padding: '4px', fontWeight: 'bold' }}>{cls.className}</td>
                    {cls.scores.map((value, scoreIdx) => (
                      <td key={scoreIdx} style={{ border: '1px solid #ccc', padding: '4px',textAlign: 'center' }}>
                        <input
                          type="number"
                          value={value}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleChange(grade, idx, scoreIdx, e.target.value)}
                          style={{ width: '50px', textAlign: 'center' }}
                        />
                      </td>
                    ))}
                    <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                      {cls.total || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      ))}

      <Stack direction="row" spacing={2} mt={3}>
        <Button variant="contained" color="primary" onClick={calcTotals}>➕ Tính tổng</Button>
        <Button variant="contained" color="success" onClick={handleSave}>💾 Lưu điểm</Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as any}>{snackbar.message}</Alert>
      </Snackbar>

      <Backdrop open={loading} sx={{ color: '#fff', zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}
