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

interface ClassLineUpSummary {
className: string;
week: number;
scores: number[];
total: number;
}

const ClassLineUpSummaryPage = () => {
const [week, setWeek] = useState<number>(1);
const [loading, setLoading] = useState(false);
const [classList, setClassList] = useState<string[]>([]);
const [summaries, setSummaries] = useState<ClassLineUpSummary[]>([]);

// Lấy danh sách lớp
const fetchClasses = async () => {
try {
const res = await api.get("/api/classes");
// giả sử trong CSDL chỉ có lớp có GVCN
const validClasses = res.data.map((cls: any) => cls.className);
setClassList(validClasses);
} catch (err) {
console.error("Lỗi khi lấy danh sách lớp:", err);
}
};

// Lấy dữ liệu điểm theo tuần
const fetchSummaries = async (selectedWeek: number) => {
try {
setLoading(true);
const res = await api.get(`/api/class-lineup-summaries?week=${selectedWeek}`);
const data: ClassLineUpSummary[] = res.data;

  // Nếu chưa có dữ liệu thì khởi tạo mặc định
  const filled = classList.map((cls) => {
    const exist = data.find((d) => d.className === cls);
    return (
      exist || {
        className: cls,
        week: selectedWeek,
        scores: Array(10).fill(0),
        total: 0,
      }
    );
  });
  setSummaries(filled);
} catch (err) {
  console.error("Lỗi khi lấy dữ liệu:", err);
} finally {
  setLoading(false);
}

};

// Khởi tạo
useEffect(() => {
const init = async () => {
await fetchClasses();
};
init();
}, []);

useEffect(() => {
if (classList.length > 0) {
fetchSummaries(week);
}
}, [week, classList]);

// Cập nhật điểm
const handleScoreChange = (className: string, index: number, value: number) => {
setSummaries((prev) =>
prev.map((s) =>
s.className === className
? {
...s,
scores: s.scores.map((sc, i) => (i === index ? value : sc)),
}
: s
)
);
};

// Tính tổng
const calculateTotal = () => {
setSummaries((prev) =>
prev.map((s) => ({
...s,
total: s.scores.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0),
}))
);
};

// Lưu dữ liệu
const saveData = async () => {
try {
setLoading(true);
await api.post("/api/class-lineup-summaries", summaries);
alert("Lưu thành công!");
} catch (err) {
console.error("Lỗi khi lưu:", err);
alert("Lỗi khi lưu dữ liệu");
} finally {
setLoading(false);
}
};

// Render bảng theo khối
const renderTableForGrade = (grade: number) => {
const classesInGrade = summaries.filter((s) => s.className.startsWith(`6`) && grade === 6
|| s.className.startsWith(`7`) && grade === 7
|| s.className.startsWith(`8`) && grade === 8
|| s.className.startsWith(`9`) && grade === 9
);
if (classesInGrade.length === 0) return null;
return (
  <Box key={grade} mb={4}>
    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
      Khối {grade}
    </Typography>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            {[...Array(10)].map((_, i) => (
              <TableCell key={i}>Lần {i + 1}</TableCell>
            ))}
            <TableCell>Tổng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {classesInGrade.map((row) => (
            <TableRow key={row.className}>
              <TableCell>{row.className}</TableCell>
              {row.scores.map((sc, i) => (
                <TableCell key={i}>
                  <TextField
                    type="number"
                    size="small"
                    value={sc}
                    onChange={(e) =>
                      handleScoreChange(row.className, i, Number(e.target.value))
                    }
                  />
                </TableCell>
              ))}
              <TableCell>{row.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);
};

return ( <Box p={3}> <Typography variant="h5" gutterBottom>
Nhập điểm xếp hàng theo tuần </Typography> <Box display="flex" alignItems="center" mb={2}> <Typography mr={2}>Chọn tuần:</Typography>
<Select
value={week}
onChange={(e) => setWeek(Number(e.target.value))}
size="small"
>
{[...Array(10)].map((_, i) => (
<MenuItem key={i + 1} value={i + 1}>
Tuần {i + 1} </MenuItem>
))} </Select> </Box>
{loading ? ( <CircularProgress />
) : (
<>
<Typography variant="body2" sx={{ mb: 2 }}>
1. Lớp xếp hàng chậm <br />
2. Nhiều HS ngồi trong lớp giờ chơi, không ra xếp hàng <br />
3. Mất trật tự trong khi xếp hàng giờ SHDC <br />
4. Ồn ào, đùa giỡn khi di chuyển lên lớp </Typography>
{renderTableForGrade(6)}
{renderTableForGrade(7)}
{renderTableForGrade(8)}
{renderTableForGrade(9)} <Box mt={2} display="flex" gap={2}> <Button variant="contained" color="primary" onClick={calculateTotal}>
TÍNH TỔNG </Button> <Button variant="contained" color="success" onClick={saveData}>
LƯU ĐIỂM </Button> </Box>
</>
)} </Box>
);
};

export default ClassLineUpSummaryPage;
