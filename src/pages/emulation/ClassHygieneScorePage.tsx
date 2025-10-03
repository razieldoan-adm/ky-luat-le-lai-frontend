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
TextField,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
_id: string;
weekNumber: number;
startDate: string;
endDate: string;
}

interface HygieneScore {
classId: string;
weekId: string;
dailyScores: number[];
totalScore: number;
}

interface ClassData {
_id: string;
name: string;
}

export default function ClassHygieneScorePage() {
const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
const [selectedWeek, setSelectedWeek] = useState<string>("");
const [classes, setClasses] = useState<ClassData[]>([]);
const [scores, setScores] = useState<Record<string, number[]>>({});
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);

// Tính danh sách ngày dựa theo setting tuần
const getDaysOfWeek = (week: AcademicWeek) => {
const days: string[] = [];
if (!week) return days;


const start = new Date(week.startDate);
for (let i = 0; i < 5; i++) {
  const d = new Date(start);
  d.setDate(start.getDate() + i);
  days.push(
    `${d.getDate()}/${d.getMonth() + 1}` // hiển thị dd/mm
  );
}
return days;

};

useEffect(() => {
const fetchWeeksAndClasses = async () => {
setLoading(true);
try {
const [weeksRes, classesRes] = await Promise.all([
api.get("/weekly-scores/weeks"),
api.get("/classes"),
]);
setWeeks(weeksRes.data || []);
setClasses(classesRes.data || []);
} catch (err) {
console.error("Lỗi tải dữ liệu:", err);
} finally {
setLoading(false);
}
};
fetchWeeksAndClasses();
}, []);

useEffect(() => {
if (!selectedWeek) return;
const fetchScores = async () => {
setLoading(true);
try {
const res = await api.get(`/class-hygiene-scores/${selectedWeek}`);
const data: HygieneScore[] = res.data || [];
const newScores: Record<string, number[]> = {};
data.forEach((item) => {
newScores[item.classId] = item.dailyScores;
});
setScores(newScores);
} catch (err) {
console.error("Lỗi tải điểm:", err);
} finally {
setLoading(false);
}
};
fetchScores();
}, [selectedWeek]);

const handleScoreChange = (classId: string, dayIndex: number, value: number) => {
setScores((prev) => {
const updated = { ...prev };
if (!updated[classId]) updated[classId] = [0, 0, 0, 0, 0];
updated[classId][dayIndex] = value;
return updated;
});
};

const handleSave = async () => {
if (!selectedWeek) return;
setSaving(true);
try {
await Promise.all(
classes.map((cls) => {
const dailyScores = scores[cls._id] || [0, 0, 0, 0, 0];
const totalScore = dailyScores.reduce((a, b) => a + b, 0);
return api.post("/class-hygiene-scores", {
classId: cls._id,
weekId: selectedWeek,
dailyScores,
totalScore,
});
})
);
alert("Lưu điểm thành công!");
} catch (err) {
console.error("Lỗi lưu điểm:", err);
alert("Lỗi khi lưu điểm!");
} finally {
setSaving(false);
}
};

const selectedWeekObj = weeks.find((w) => w._id === selectedWeek);
const days = selectedWeekObj ? getDaysOfWeek(selectedWeekObj) : [];

return ( <Box p={3}> <Typography variant="h6" gutterBottom>
Nhập điểm vệ sinh lớp </Typography> <Box mb={2} display="flex" gap={2}>
<Select
value={selectedWeek}
onChange={(e) => setSelectedWeek(e.target.value)}
displayEmpty
> <MenuItem value="">-- Chọn tuần --</MenuItem>
{weeks.map((w) => ( <MenuItem key={w._id} value={w._id}>
Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} -{" "}
{new Date(w.endDate).toLocaleDateString()}) </MenuItem>
))} </Select> <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
{saving ? "Đang lưu..." : "Lưu điểm"} </Button> </Box>

  {loading ? (
    <CircularProgress />
  ) : (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            {days.map((d, idx) => (
              <TableCell key={idx}>Ngày {idx + 2} ({d})</TableCell>
            ))}
            <TableCell>Tổng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {classes.map((cls) => {
            const daily = scores[cls._id] || [0, 0, 0, 0, 0];
            const total = daily.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={cls._id}>
                <TableCell>{cls.name}</TableCell>
                {daily.map((score, idx) => (
                  <TableCell key={idx}>
                    <TextField
                      type="number"
                      value={score}
                      onChange={(e) =>
                        handleScoreChange(cls._id, idx, parseInt(e.target.value) || 0)
                      }
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  </TableCell>
                ))}
                <TableCell>{total}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )}
</Box>

);
}
