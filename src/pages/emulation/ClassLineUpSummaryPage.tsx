import { useEffect, useState } from 'react';
import {
Box,
Button,
CircularProgress,
MenuItem,
Paper,
Select,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
Typography,
TextField,
} from '@mui/material';
import api from '../../api/api';

interface Summary {
className: string;
week: number;
totalScore: number;
}

const ClassLineUpSummaryPage = () => {
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [summaries, setSummaries] = useState<Summary[]>([]);
const [week, setWeek] = useState<number>(1);
const [classList, setClassList] = useState<string[]>([]);

useEffect(() => {
fetchClasses();
}, []);

useEffect(() => {
if (classList.length > 0 && week) {
fetchSummaries(week);
}
}, [week, classList]);

const fetchClasses = async () => {
try {
const res = await api.get('/api/classes');
// API đã trả sẵn danh sách lớp có GVCN trong DB
setClassList(res.data.map((cls: any) => cls.className));
} catch (err) {
console.error('Lỗi khi lấy lớp:', err);
}
};

const fetchSummaries = async (selectedWeek: number) => {
try {
setLoading(true);
const res = await api.get(`/api/class-lineup-summaries?week=${selectedWeek}`);
if (res.data.length > 0) {
setSummaries(res.data);
} else {
// nếu chưa có dữ liệu thì tạo mới danh sách lớp với totalScore mặc định
const emptySummaries = classList.map((cls) => ({
className: cls,
week: selectedWeek,
totalScore: 0,
}));
setSummaries(emptySummaries);
}
} catch (err) {
console.error('Lỗi khi lấy dữ liệu tổng kết xếp hàng:', err);
} finally {
setLoading(false);
}
};

const handleScoreChange = (className: string, value: number) => {
setSummaries((prev) =>
prev.map((s) =>
s.className === className ? { ...s, totalScore: value } : s
)
);
};

const handleSave = async () => {
try {
setSaving(true);
await api.post('/api/class-lineup-summaries', summaries);
alert('Lưu dữ liệu thành công!');
} catch (err) {
console.error('Lỗi khi lưu dữ liệu:', err);
alert('Có lỗi xảy ra khi lưu dữ liệu.');
} finally {
setSaving(false);
}
};

return ( <Box p={3}> <Typography variant="h5" gutterBottom>
Tổng kết điểm xếp hàng theo tuần </Typography> <Box mb={2}> <Typography component="span" mr={2}>
Chọn tuần: </Typography>
<Select
value={week}
onChange={(e) => setWeek(Number(e.target.value))}
size="small"
>
{Array.from({ length: 35 }, (_, i) => (
<MenuItem key={i + 1} value={i + 1}>
Tuần {i + 1} </MenuItem>
))} </Select> </Box>


  {loading ? (
    <CircularProgress />
  ) : (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            <TableCell>Điểm tổng kết</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaries.map((s) => (
            <TableRow key={s.className}>
              <TableCell>{s.className}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={s.totalScore}
                  onChange={(e) =>
                    handleScoreChange(s.className, Number(e.target.value))
                  }
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )}
  <Box mt={2}>
    <Button
      variant="contained"
      color="primary"
      onClick={handleSave}
      disabled={saving}
    >
      {saving ? 'Đang lưu...' : 'LƯU DỮ LIỆU'}
    </Button>
  </Box>
</Box>
);
};

export default ClassLineUpSummaryPage;
