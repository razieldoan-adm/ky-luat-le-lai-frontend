import { useEffect, useState } from "react";
import {
Box,
Button,
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
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
_id: string;
weekNumber: number;
startDate: string;
endDate: string;
}

interface ClassItem {
_id: string;
name: string;
}

interface LineUpSummary {
classId: string;
weekId: string;
errors: string[]; // 10 ô, mỗi ô là 1 lỗi theo quy ước hoặc rỗng
}

export default function ClassLineUpSummaryPage() {
const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
const [selectedWeek, setSelectedWeek] = useState<string>("");
const [classList, setClassList] = useState<ClassItem[]>([]);
const [data, setData] = useState<Record<string, string[]>>({}); // classId -> errors[]

// lấy danh sách tuần
const fetchWeeks = async () => {
try {
const res = await api.get("/api/academic-weeks/study-weeks");
setWeekList(res.data);
} catch (err) {
console.error("Lỗi khi lấy tuần:", err);
}
};

// lấy danh sách lớp
const fetchClasses = async () => {
try {
const res = await api.get("/api/classes");
setClassList(res.data);
} catch (err) {
console.error("Lỗi khi lấy lớp:", err);
}
};

// lấy dữ liệu đã lưu theo tuần
const fetchSummaries = async (weekId: string) => {
try {
const res = await api.get("/api/class-lineup-summaries", {
params: { weekId },
});
const summaries: LineUpSummary[] = res.data;

  // map lại dữ liệu cho state data
  const newData: Record<string, string[]> = {};
  classList.forEach((cls) => {
    const found = summaries.find((s) => s.classId === cls._id);
    newData[cls._id] = found ? found.errors : Array(10).fill("");
  });
  setData(newData);
} catch (err) {
  console.error("Lỗi khi lấy dữ liệu tổng kết:", err);
}

};

// khởi tạo
useEffect(() => {
fetchWeeks();
fetchClasses();
}, []);

// khi đổi tuần thì load dữ liệu
const handleWeekChange = (weekId: string) => {
setSelectedWeek(weekId);
if (weekId) {
fetchSummaries(weekId);
}
};

// xử lý nhập lỗi
const handleChangeError = (classId: string, index: number, value: string) => {
setData((prev) => {
const copy = { ...prev };
if (!copy[classId]) copy[classId] = Array(10).fill("");
copy[classId][index] = value;
return copy;
});
};

// lưu dữ liệu
const handleSave = async () => {
if (!selectedWeek) return;
const payload = Object.keys(data).map((classId) => ({
classId,
weekId: selectedWeek,
errors: data[classId],
}));
try {
await api.post("/api/class-lineup-summaries", payload);
alert("Đã lưu dữ liệu!");
fetchSummaries(selectedWeek); // load lại dữ liệu ngay sau khi lưu
} catch (err) {
console.error("Lỗi khi lưu:", err);
}
};

return ( <Box p={2}> <Typography variant="h5" mb={2}>
Tổng kết xếp hàng lớp </Typography>
  <Box mb={2}>
    <Select
      value={selectedWeek}
      onChange={(e) => handleWeekChange(e.target.value)}
      displayEmpty
    >
      <MenuItem value="">-- Chọn tuần --</MenuItem>
      {weekList.map((w) => (
        <MenuItem key={w._id} value={w._id}>
          Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
        </MenuItem>
      ))}
    </Select>
  </Box>

  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Lớp</TableCell>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableCell key={i}>Ô {i + 1}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {classList.map((cls) => (
          <TableRow key={cls._id}>
            <TableCell>{cls.name}</TableCell>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableCell key={i}>
                <input
                  value={data[cls._id]?.[i] || ""}
                  onChange={(e) =>
                    handleChangeError(cls._id, i, e.target.value)
                  }
                  style={{ width: "50px" }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>

  <Box mt={2}>
    <Button
      variant="contained"
      onClick={handleSave}
      disabled={!selectedWeek}
    >
      Lưu dữ liệu
    </Button>
  </Box>
</Box>

);
}
