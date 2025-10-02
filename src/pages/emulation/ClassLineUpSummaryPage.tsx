import { useEffect, useState } from 'react';
import api from '../../api/api';
import {
Box,
Typography,
TextField,
Button,
MenuItem,
Stack,
Snackbar,
Alert,
Backdrop,
CircularProgress,
} from '@mui/material';

interface ClassFromAPI {
_id: string;
className: string;
grade: string;
teacher?: string;
}

interface ClassType {
className: string;
grade: string;
scores: number[]; // 10 ô nhập
total?: number;
}

const grades = ['6', '7', '8', '9'];

const colLabels = [
'Lần 1',
'Lần 2',
'Lần 3',
'Lần 4',
'Lần 5',
'Lần 6',
'Lần 7',
'Lần 8',
'Lần 9',
'Lần 10',
];

// ✅ Danh sách lỗi rút gọn (4 lỗi)
const violations = [
'1. Lớp xếp hàng chậm',
'2. Nhiều hs ngồi trong lớp giờ chơi, không ra xếp hàng',
'3. Mất trật tự trong khi xếp hàng giờ SHDC',
'4. Ồn ào, đùa giỡn khi di chuyển lên lớp',
];

export default function ClassLineUpSummaryPage() {
const [weekList, setWeekList] = useState<any[]>([]);
const [weekHasData, setWeekHasData] = useState<Record<string, boolean>>({});
const [selectedWeek, setSelectedWeek] = useState<any>(null);
const [classes, setClasses] = useState<ClassFromAPI[]>([]);
const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
const [snackbar, setSnackbar] = useState({
open: false,
message: '',
severity: 'success' as 'success' | 'error' | 'info' | 'warning',
});
const [loading, setLoading] = useState(false);
const [rankingPoint, setRankingPoint] = useState<number>(10);

// --- On mount
useEffect(() => {
fetchSettings();
fetchClasses();
fetchWeeks();
}, []);

useEffect(() => {
if (!selectedWeek) return;
initializeData(selectedWeek.weekNumber);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedWeek, classes]);

const fetchSettings = async () => {
try {
const res = await api.get('/api/settings');
const ranking = res.data?.disciplinePointDeduction?.ranking ?? 10;
setRankingPoint(ranking);
} catch (err) {
console.error('Error fetching settings:', err);
}
};

const fetchClasses = async () => {
try {
const res = await api.get('/api/classes');
setClasses(res.data || []);
} catch (err) {
console.error('Error fetching classes:', err);
}
};

const fetchWeeks = async () => {
setLoading(true);
try {
const res = await api.get('/api/academic-weeks/study-weeks');
const weeks = res.data || [];
setWeekList(weeks);

```
  if (weeks.length > 0) {
    setSelectedWeek(weeks[0]);
  }

  const checks = await Promise.all(
    weeks.map(async (w: any) => {
      try {
        const r = await api.get('/api/class-lineup-summaries', {
          params: { weekNumber: w.weekNumber },
        });
        const has = Array.isArray(r.data) && r.data.length > 0;
        return { id: w._id, has };
      } catch {
        return { id: w._id, has: false };
      }
    })
  );

  const map: Record<string, boolean> = {};
  checks.forEach((c) => {
    map[c.id] = c.has;
  });
  setWeekHasData(map);
} catch (err) {
  console.error('Error fetching weeks:', err);
} finally {
  setLoading(false);
}
```

};

const initializeData = async (weekNumber: number) => {
setLoading(true);
const initial: { [key: string]: ClassType[] } = {};

```
grades.forEach((grade) => {
  const classesForGrade = classes
    .filter((c) => String(c.grade) === String(grade))
    .map((c) => ({
      className: c.className,
      grade: c.grade,
      scores: Array(10).fill(0),
    }));
  initial[grade] = classesForGrade;
});

try {
  const res = await api.get('/api/class-lineup-summaries', {
    params: { weekNumber },
  });
  const saved = res.data || [];

  saved.forEach((s: any) => {
    const target = initial[s.grade]?.find(
      (t) => t.className === s.className
    );
    if (target) {
      target.scores = s.data || Array(10).fill(0);
      target.total = s.total || 0;
    }
  });
} catch (err) {
  console.error('Error loading summaries for week:', err);
}

setData(initial);
setLoading(false);
```

};

const handleChange = (
grade: string,
classIdx: number,
scoreIdx: number,
value: string
) => {
const updated = { ...data };
if (!updated[grade] || !updated[grade][classIdx]) return;

```
const num = Number(value);
updated[grade][classIdx].scores[scoreIdx] =
  num >= 1 && num <= violations.length ? num : 0;
setData(updated);
```

};

const calcTotals = () => {
const updated = { ...data };
grades.forEach((grade) => {
updated[grade]?.forEach((cls) => {
const count = cls.scores.filter((v) => v !== 0).length;
cls.total = count * rankingPoint;
});
});
setData(updated);
};

const handleSave = async () => {
if (!selectedWeek) {
setSnackbar({
open: true,
message: 'Vui lòng chọn tuần trước khi lưu',
severity: 'warning',
});
return;
}
setLoading(true);

```
try {
  const payload = {
    weekNumber: selectedWeek.weekNumber,
    summaries: grades.flatMap((g) =>
      (data[g] || []).map((c) => ({
        className: c.className,
        grade: c.grade,
        data: c.scores,
        total: c.total || 0,
      }))
    ),
  };

  await api.post('/api/class-lineup-summaries', payload);

  setWeekHasData((prev) => ({
    ...prev,
    [selectedWeek._id]: true,
  }));

  setSnackbar({
    open: true,
    message: 'Đã lưu điểm xếp hàng thành công!',
    severity: 'success',
  });
} catch (err) {
  console.error('Save error:', err);
  setSnackbar({
    open: true,
    message: 'Lỗi khi lưu dữ liệu, thử lại sau',
    severity: 'error',
  });
} finally {
  setLoading(false);
}
```

};

const handleWeekChange = (e: any) => {
const w = weekList.find((x) => x._id === e.target.value);
setSelectedWeek(w || null);
};

return (
<Box sx={{ p: 2 }}> <Typography variant="h5" fontWeight="bold" gutterBottom>
📝 Nhập điểm xếp hàng theo tuần </Typography>

```
  <Stack direction="row" spacing={2} mb={2} alignItems="center">
    <TextField
      select
      label="Chọn tuần"
      value={selectedWeek?._id || ''}
      onChange={handleWeekChange}
      sx={{ width: 240 }}
    >
      {weekList.map((w) => (
        <MenuItem
          key={w._id}
          value={w._id}
          sx={{
            backgroundColor: weekHasData[w._id] ? '#e8f5e9' : 'transparent',
            color: weekHasData[w._id] ? 'green' : 'inherit',
            fontWeight: weekHasData[w._id] ? 600 : 400,
          }}
        >
          {`Tuần ${w.weekNumber}`} {weekHasData[w._id] ? '— (Đã có dữ liệu)' : ''}
        </MenuItem>
      ))}
    </TextField>
  </Stack>

  <Box mb={2}>
    {violations.map((v) => (
      <Typography key={v} variant="body2">
        {v}
      </Typography>
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
              <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                Lớp
              </th>
              {colLabels.map((label) => (
                <th
                  key={label}
                  style={{ border: '1px solid #ccc', padding: '6px' }}
                >
                  {label}
                </th>
              ))}
              <th style={{ border: '1px solid #ccc', padding: '6px' }}>
                Tổng
              </th>
            </tr>
          </thead>
          <tbody>
            {data[grade]?.map((cls, idx) => (
              <tr key={cls.className}>
                <td
                  style={{
                    border: '1px solid #ccc',
                    padding: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  {cls.className}
                </td>
                {cls.scores.map((value, scoreIdx) => (
                  <td
                    key={scoreIdx}
                    style={{
                      border: '1px solid #ccc',
                      padding: '6px',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      type="number"
                      value={value}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) =>
                        handleChange(grade, idx, scoreIdx, e.target.value)
                      }
                      min={1}
                      max={violations.length}
                      style={{ width: '50px', textAlign: 'center' }}
                    />
                  </td>
                ))}
                <td
                  style={{
                    border: '1px solid #ccc',
                    padding: '6px',
                    textAlign: 'center',
                  }}
                >
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
    <Button variant="contained" color="primary" onClick={calcTotals}>
      ➕ Tính tổng
    </Button>
    <Button variant="contained" color="success" onClick={handleSave}>
      💾 Lưu điểm
    </Button>
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
```

);
}
