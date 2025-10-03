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
Typography,
Paper,
} from "@mui/material";
import api from "../../api/api";

interface ClassScore {
className: string;
grade: string;
scores: number[]; // mảng 15 phần tử (5 ngày x 3 buổi)
totalScore: number;
}

interface AcademicWeek {
_id: string;
weekNumber: number;
startDate: string;
endDate: string;
}

const sessionsPerDay = 3;
const daysPerWeek = 5;

const ClassHygieneScorePage = () => {
const [classes, setClasses] = useState<ClassScore[]>([]);
const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
const [selectedWeek, setSelectedWeek] = useState<number | "">("");

const [loading, setLoading] = useState(false);

const getWeekLabel = (w: AcademicWeek) => {
const start = new Date(w.startDate).toLocaleDateString("vi-VN");
const end = new Date(w.endDate).toLocaleDateString("vi-VN");
return `Tuần ${w.weekNumber} (${start} - ${end})`;
};

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

const initializeData = async (weekNumber: number) => {
setLoading(true);
try {
const res = await api.get("/api/class-hygiene-scores", {
params: { weekNumber },
});
const data = res.data;


  if (data.length > 0) {
    setClasses(
      data.map((c: any) => ({
        className: c.className,
        grade: c.grade,
        scores: c.scores || Array(daysPerWeek * sessionsPerDay).fill(0),
        totalScore: c.totalScore || 0,
      }))
    );
  } else {
    const classRes = await api.get("/api/classes");
    setClasses(
      classRes.data.map((cls: any) => ({
        className: cls.name,
        grade: cls.grade,
        scores: Array(daysPerWeek * sessionsPerDay).fill(0),
        totalScore: 0,
      }))
    );
  }
} catch (err) {
  console.error("Lỗi khi load dữ liệu:", err);
} finally {
  setLoading(false);
}


};

const toggleScore = (classIdx: number, dayIdx: number, sessionIdx: number) => {
setClasses((prev) => {
const updated = [...prev];
const scores = [...updated[classIdx].scores];
const index = dayIdx * sessionsPerDay + sessionIdx;
scores[index] = scores[index] === 1 ? 0 : 1;
const totalScore = scores.reduce((a, b) => a + b, 0);
updated[classIdx] = {
...updated[classIdx],
scores,
totalScore,
};
return updated;
});
};

const saveScores = async () => {
if (!selectedWeek) return;
try {
await api.post("/api/class-hygiene-scores", {
weekNumber: selectedWeek,
scores: classes.map((c) => ({
className: c.className,
grade: c.grade,
scores: c.scores,
totalScore: c.totalScore,
})),
});
alert("Lưu điểm vệ sinh thành công!");
} catch (err) {
console.error("Lỗi khi lưu:", err);
alert("Lỗi khi lưu điểm.");
}
};

useEffect(() => {
fetchWeeks();
}, []);

useEffect(() => {
if (selectedWeek) {
initializeData(Number(selectedWeek));
}
}, [selectedWeek]);

return ( <Box p={2}> <Typography variant="h5" gutterBottom>
Quản lý điểm vệ sinh lớp học </Typography>


  {/* Chọn tuần */}
  <Box display="flex" alignItems="center" mb={2}>
    <Typography mr={2}>Chọn tuần:</Typography>
    <Select
      value={selectedWeek}
      onChange={(e) => {
        const value = Number(e.target.value);
        if (value === selectedWeek) {
          initializeData(value); // reload nếu chọn lại cùng tuần
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
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            {[...Array(daysPerWeek)].map((_, d) => (
              <TableCell key={d} align="center" colSpan={sessionsPerDay}>
                Thứ {d + 2}
              </TableCell>
            ))}
            <TableCell align="center">Tổng</TableCell>
          </TableRow>
          <TableRow>
            <TableCell></TableCell>
            {[...Array(daysPerWeek * sessionsPerDay)].map((_, idx) => (
              <TableCell key={idx} align="center">
                Ca {idx % sessionsPerDay + 1}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {classes.map((c, classIdx) => (
            <TableRow key={c.className}>
              <TableCell>{c.className}</TableCell>
              {c.scores.map((val, idx) => (
                <TableCell
                  key={idx}
                  align="center"
                  onClick={() =>
                    toggleScore(
                      classIdx,
                      Math.floor(idx / sessionsPerDay),
                      idx % sessionsPerDay
                    )
                  }
                  style={{
                    cursor: "pointer",
                    backgroundColor: val ? "#4caf50" : "#f5f5f5",
                  }}
                >
                  {val ? "✓" : ""}
                </TableCell>
              ))}
              <TableCell align="center">{c.totalScore}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )}

  <Box mt={2}>
    <Button variant="contained" onClick={saveScores}>
      Lưu
    </Button>
  </Box>
</Box>


);
};

export default ClassHygieneScorePage;
