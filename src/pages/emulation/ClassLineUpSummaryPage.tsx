import { useState, useEffect } from 'react';
import api from '../../api/api';
import {
  Box, Typography, TextField, Button, MenuItem, Stack, Snackbar, Alert, Backdrop, CircularProgress
} from '@mui/material';





interface ClassType {
  className: string;
  grade: string;
  scores: number[]; // 10 ô nhập điểm vi phạm
  total?: number;
}

const grades = ['6', '7', '8', '9'];
const colLabels = ['Lần 1', 'Lần 2',
  'Lần 3', 'Lần 4',
  'Lần 5', 'Lần 6',
  'Lần 7', 'Lần 8',
  'Lần 9', 'Lần 10'];

const violations = [
  '1. Lớp xếp hàng chậm',
  '2. Nhiều hs ngồi trong lớp giờ chơi, không ra xếp hàng',
  '3. Mở đèn quạt giờ chơi',
  '4. Vệ sinh chỗ xếp hàng không sạch',
  '5. Mất trật tự trong khi xếp hàng giờ SHDC',
  '6. Ồn ào, đùa giỡn khi di chuyển lên lớp'
];

export default function ClassLineUpSummaryPage() {
  const [weekList, setWeekList] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [rankingPoint, setRankingPoint] = useState<number>(10); // ✅ mặc định, sẽ load từ settings

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      setRankingPoint(res.data.disciplinePointDeduction?.ranking || 10);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };


  const fetchWeeks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
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
      const res = await api.get('/api/class-lineup-summaries', { params: { weekNumber } });
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
    const num = Number(value);
    updated[grade][classIdx].scores[scoreIdx] = (num >= 1 && num <= 6) ? num : 0;
    setData(updated);
  };

  const calcTotals = () => {
    const updated = { ...data };
    grades.forEach(grade => {
      updated[grade].forEach(cls => {
        // ✅ Đếm số ô có giá trị khác 0, nhân với rankingPoint
        const count = cls.scores.filter(v => v !== 0).length;
        cls.total = count * rankingPoint;
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

      await api.post('/api/class-lineup-summaries', payload);
      setSnackbar({ open: true, message: 'Đã lưu điểm xếp hàng thành công!', severity: 'success' });
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
        📝 Nhập điểm xếp hàng theo tuần
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

      <Box mb={2}>
        {violations.map(v => (
          <Typography key={v} variant="body2">{v}</Typography>
        ))}
      </Box>

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
                      <td key={scoreIdx} style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={value}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleChange(grade, idx, scoreIdx, e.target.value)}
                          min="1"
                          max="6"
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
