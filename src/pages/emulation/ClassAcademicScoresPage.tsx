import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Table, TableHead, TableRow, TableCell, TableBody,
  MenuItem, Stack, Snackbar, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneIcon from '@mui/icons-material/Done';
import axios from 'axios';

interface ClassType {
  className: string;
  teacher?: string;
  grade: string;
  academicScore: number;
}

interface Week {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ClassAcademicScoresPage() {
  const [classList, setClassList] = useState<ClassType[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(0);
  const [maxScores, setMaxScores] = useState<{ [key: string]: number }>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isEditable, setIsEditable] = useState(false);
  const [_isUpdateMode, setIsUpdateMode] = useState(false);
  
  // 🔰 Load settings + weeks ban đầu
  useEffect(() => {
    const loadAll = async () => {
      await fetchSettings();
      await fetchWeeks();
    };
    loadAll();
  }, []);

  // 🔰 Chọn tuần đầu tiên khi weeks có dữ liệu
  useEffect(() => {
    if (weeks.length > 0) {
      setSelectedWeekNumber(weeks[0].weekNumber);
    }
  }, [weeks]);
  
  // 🔰 Load classList + scores khi đổi tuần
  useEffect(() => {
    const loadDataForWeek = async () => {
      if (!selectedWeekNumber) return;

      const generated = generateClassList();
      const merged = await fetchClasses(generated);
      setClassList(merged);

      // ✅ Sau khi setClassList, mới fetch scores để đảm bảo data đầy đủ
      fetchScoresForWeek(selectedWeekNumber, merged);
    };

    loadDataForWeek();
  }, [selectedWeekNumber]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setMaxScores(res.data.maxClassAcademicScoresByGrade || {});
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await axios.get('/api/academic-weeks/study-weeks');
      setWeeks(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy weeks:', err);
    }
  };

  const generateClassList = (): ClassType[] => {
    const result: ClassType[] = [];
    for (let grade = 6; grade <= 9; grade++) {
      for (let i = 1; i <= 10; i++) {
        result.push({
          className: `${grade}A${i}`,
          teacher: '',
          grade: `${grade}`,
          academicScore: 0,
        });
      }
    }
    return result;
  };

  const fetchClasses = async (generated: ClassType[]) => {
    try {
      const res = await axios.get('/api/classes/with-teacher');
      const existing = res.data;

      const merged = generated.map(cls => {
        const found = existing.find((e: any) => e.className === cls.className);
        return found
          ? { ...cls, teacher: found.teacher, academicScore: found.academicScore || 0 }
          : cls;
      });

      return merged;
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp:', err);
      return generated;
    }
  };

  const fetchScoresForWeek = async (weekNumber: number, currentClassList: ClassType[]) => {
    try {
      const res = await axios.get('/api/class-academic-scores', { params: { weekNumber } });
      const data = res.data;

      if (data.length === 0) {
        // ✅ Nếu chưa có data tuần này, reset điểm về 0
        const reset = currentClassList.map(cls => ({ ...cls, academicScore: 0 }));
        setClassList(reset);
        setIsEditable(true);
        setIsUpdateMode(false);
      } else {
        const updated = currentClassList.map(cls => {
          const found = data.find((s: any) => s.className === cls.className);
          return found ? { ...cls, academicScore: found.score } : cls;
        });
        setClassList(updated);
        setIsEditable(false);
        setIsUpdateMode(false);
      }
    } catch (err) {
      console.error('Lỗi khi load scores:', err);
    }
  };

  const handleScoreChange = (index: number, value: number) => {
    const updated = [...classList];
    updated[index].academicScore = value;
    setClassList(updated);
  };

  const handleUpdateToggle = async () => {
    if (!isEditable) {
      setIsEditable(true);
      setIsUpdateMode(true);
    } else {
      try {
        await axios.put('/api/class-academic-scores', {
          weekNumber: selectedWeekNumber,
          scores: classList.map(c => ({
            className: c.className,
            grade: c.grade,
            score: c.academicScore
          }))
        });
        setSnackbar({ open: true, message: 'Đã cập nhật điểm thành công!', severity: 'success' });
        setIsEditable(false);
        setIsUpdateMode(false);
      } catch (err) {
        console.error('Lỗi khi cập nhật:', err);
        setSnackbar({ open: true, message: 'Lỗi khi cập nhật điểm.', severity: 'error' });
      }
    }
  };

  const getStatusIcon = (cls: ClassType) => {
    const limit = maxScores[cls.grade] ?? 7; // ✅ fallback 7 nếu chưa có
    return cls.academicScore <= limit
      ? <CheckCircleIcon color="success" />
      : <CancelIcon color="error" />;
  };

  const selectedWeek = weeks.find(w => w.weekNumber === selectedWeekNumber);

  const renderTable = (grade: string) => {
    const classes = classList.filter(cls => cls.grade === grade);
    return (
      <Box key={grade} sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Khối {grade}
        </Typography>
        <Table component={Paper} size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#e0f7fa' }}>
              <TableCell><strong>STT / ✔</strong></TableCell>
              <TableCell><strong>Lớp</strong></TableCell>
              <TableCell><strong>Điểm HT</strong></TableCell>
              <TableCell><strong>Xác nhận</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((cls, idx) => (
              <TableRow key={cls.className}>
                <TableCell>
                  {cls.teacher ? <DoneIcon color="success" /> : idx + 1}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{cls.className}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={cls.academicScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleScoreChange(classList.findIndex(c => c.className === cls.className), parseInt(e.target.value))}
                    inputProps={{ min: 0, max: 10 }}
                    disabled={!isEditable}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {getStatusIcon(cls)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        📊 Nhập điểm học tập lớp theo tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeekNumber}
          onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
          sx={{ width: 150 }}
        >
          {weeks.map(w => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              {`Tuần ${w.weekNumber}`}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Từ ngày"
          value={selectedWeek ? new Date(selectedWeek.startDate).toLocaleDateString() : ''}
          InputProps={{ readOnly: true }}
          sx={{ width: 150 }}
        />

        <TextField
          label="Đến ngày"
          value={selectedWeek ? new Date(selectedWeek.endDate).toLocaleDateString() : ''}
          InputProps={{ readOnly: true }}
          sx={{ width: 150 }}
        />
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {['6', '7', '8', '9'].map(renderTable)}
      </Box>

      <Stack direction="row" spacing={2} mt={3}>
        <Button variant="contained" color="primary" onClick={handleUpdateToggle}>
          {isEditable ? '✅ Hoàn thành' : '✏️ Cập nhật'}
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as 'success' | 'error' | 'info' | 'warning'}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
