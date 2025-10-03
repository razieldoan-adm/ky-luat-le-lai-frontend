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

interface AcademicWeek {
_id: string;
weekNumber: number;
startDate: string;
endDate: string;
}

interface ClassLineUpSummary {
className: string;
weekNumber: number;
scores: number[]; // 10 ô nhập số (1-4)
total: number;
}

const ClassLineUpSummaryPage = () => {
const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
const [selectedWeek, setSelectedWeek] = useState<number>(1);
const [loading, setLoading] = useState(false);
const [classList, setClassList] = useState<string[]>([]);
const [summaries, setSummaries] = useState<ClassLineUpSummary[]>([]);

// Lấy tuần từ API
const fetchWeeks = async () => {
try {
const res = await api.get("/api/academic-weeks/study-weeks");
setWeekList(res.data);
if (res.data.length > 0) {
setSelectedWeek(res.data[0].weekNumber);
}
} catch (err) {
console.error("Lỗi khi lấy tuần:", err);
}
};

// Lấy danh sách lớp
const fetchClasses = async () => {
try {
const res = await api.get("/api/classes");
const validClasses = res.data.map((cls: any) => cls.className);
setClassList(validClasses);
} catch (err) {
console.error("Lỗi khi lấy danh sách lớp:", err);
}
};

// Lấy dữ liệu điểm theo tuần
const fetchSummaries = async (weekNumber: number) => {
try {
setLoading(true);
const res = await api.get(`/api/class-lineup-summaries?week=${weekNumber}`);
const data: ClassLineUpSummary[] = res.data;
  const filled = classList.map((cls) => {
    const exist = data.find((d) => d.className === cls);
    return (
      exist || {
        className: cls,
        weekNumber,
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
await fetchWeeks();
await fetchClasses();
};
init();
}, []);

// Khi đổi tuần hoặc có classList thì load dữ liệu
useEffect(() => {
if (classList.length > 0 && selectedWeek) {
fetchSummaries(selectedWeek);
}
}, [selectedWeek, classList]);

// Cập nhật lỗi (số từ 1 → 4)
const handleScoreChange = (className: string, index: number, value: number) => {
if (value < 0 || value > 4) return; // chỉ cho nhập 0-4
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
total: s.scores.filter((sc) => sc > 0).length * 10,
}))
);
};
// Lưu dữ liệu
const saveData = async () => {
try {
setLoading(true);
const payload = {
weekNumber: selectedWeek,
summaries: summaries.map((s) => ({
className: s.className,
weekNumber: selectedWeek,
data: s.scores,
total: s.total,
})),
};
await api.post("/api/class-lineup-summaries", payload);
alert("Lưu thành công!");
// 👉 load lại ngay dữ liệu vừa lưu
fetchSummaries(selectedWeek);
} catch (err) {
console.error("Lỗi khi lưu:", err);
alert("Lỗi khi lưu dữ liệu");
} finally {
setLoading(false);
}
};

// Hiển thị nhãn tuần
const getWeekLabel = (week: AcademicWeek) => {
const today = new Date();
const start = new Date(week.startDate);
const end = new Date(week.endDate);

if (today < start) return `Tuần ${week.weekNumber} (chưa diễn ra)`;
if (today > end) return `Tuần ${week.weekNumber} (đã qua)`;
return `Tuần ${week.weekNumber} (hiện tại)`;
};

// Render bảng theo khối
const renderTableForGrade = (grade: number) => {
const classesInGrade = summaries.filter(
(s) =>
(s.className.startsWith("6") && grade === 6) ||
(s.className.startsWith("7") && grade === 7) ||
(s.className.startsWith("8") && grade === 8) ||
(s.className.startsWith("9") && grade === 9)
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
                    inputProps={{ min: 0, max: 4 }}
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

return ( <Box p={3}> <Typography variant="h5" gutterBottom> Nhập điểm xếp hàng theo tuần </Typography>

  <Box display="flex" alignItems="center" mb={2}>
    <Typography mr={2}>Chọn tuần:</Typography>
    <Select
      value={selectedWeek}
      onChange={(e) => {
        const value = Number(e.target.value);
        if (value === selectedWeek) {
          // chọn lại cùng tuần vẫn reload
          fetchSummaries(value);
        }
        setSelectedWeek(value);
      }}
      size="small"
    >
      {weekList.map((w) => (
        <MenuItem key={w._id} value={w.weekNumber}>
          {getWeekLabel(w)}
        </MenuItem>
      ))}
    </Select>
  </Box>

  {loading ? (
    <CircularProgress />
  ) : (
    <>
      <Typography variant="body2" sx={{ mb: 2 }}>
        1. Lớp xếp hàng chậm <br />
        2. Nhiều HS ngồi trong lớp giờ chơi, không ra xếp hàng <br />
        3. Mất trật tự trong khi xếp hàng giờ SHDC <br />
        4. Ồn ào, đùa giỡn khi di chuyển lên lớp
      </Typography>

      {renderTableForGrade(6)}
      {renderTableForGrade(7)}
      {renderTableForGrade(8)}
      {renderTableForGrade(9)}

      <Box mt={2} display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={calculateTotal}>
          TÍNH TỔNG
        </Button>
        <Button variant="contained" color="success" onClick={saveData}>
          LƯU ĐIỂM
        </Button>
      </Box>
    </>
  )}
</Box>

);
};
export default ClassLineUpSummaryPage;
