import { useState, useEffect } from "react";
import {
Box,
Typography,
TextField,
Button,
Paper,
Table,
TableHead,
TableRow,
TableCell,
TableBody,
MenuItem,
Stack,
Checkbox,
Snackbar,
Alert,
} from "@mui/material";
import api from "../../api/api";

interface ClassType {
className: string;
grade: string;
scores: number[]; // lưu giống trang xếp hàng: mảng số (0/1)
}

interface AcademicWeek {
_id: string;
weekNumber: number;
startDate: string;
endDate: string;
}

const grades = ["6", "7", "8", "9"];

// 5 ngày học trong tuần
const getWeekDays = (startDate: string) => {
const start = new Date(startDate);
const days: string[] = [];
for (let i = 0; i < 5; i++) {
const d = new Date(start);
d.setDate(start.getDate() + i);
days.push(
d.toLocaleDateString("vi-VN", {
weekday: "short",
day: "2-digit",
month: "2-digit",
})
);
}
return days;
};

export default function ClassHygieneScorePage() {
const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
const [snackbar, setSnackbar] = useState({
open: false,
message: "",
severity: "success",
});
const [hygienePoint, setHygienePoint] = useState<number>(1); // 1 điểm mỗi lỗi

useEffect(() => {
fetchWeeks();
}, []);

const fetchWeeks = async () => {
try {
const res = await api.get("/weekly-scores/weeks"); // ✅ đồng bộ API với trang xếp hạng
setWeekList(res.data);
if (res.data.length > 0) {
setSelectedWeek(res.data[0]);
initializeData(res.data[0].weekNumber);
}
} catch (err) {
console.error("Lỗi khi lấy weeks:", err);
}
};

const initializeData = async (weekNumber: number) => {
const initial: { [key: string]: ClassType[] } = {};
grades.forEach((grade) => {
const classes: ClassType[] = [];
for (let i = 1; i <= 10; i++) {
classes.push({
className: `${grade}A${i}`,
grade,
scores: Array(5 * 2 * 3).fill(0), // ✅ 5 ngày × 2 buổi × 3 lỗi
});
}
initial[grade] = classes;
});


try {
  const res = await api.get("/api/class-hygiene-scores", {
    params: { weekNumber },
  });

  res.data.forEach((cls: any) => {
    const target = initial[cls.grade].find(
      (c) => c.className === cls.className
    );
    if (target) {
      target.scores = cls.scores || Array(5 * 2 * 3).fill(0);
    }
  });
} catch (err) {
  console.error("Lỗi khi load hygiene scores:", err);
}

setData(initial);

};

const handleCheck = (
grade: string,
classIdx: number,
index: number
) => {
const updated = { ...data };
updated[grade][classIdx].scores[index] =
updated[grade][classIdx].scores[index] === 1 ? 0 : 1;
setData(updated);
};

const calculateTotal = (scores: number[]) =>
scores.filter((s) => s === 1).length * hygienePoint;

const handleSave = async () => {
if (!selectedWeek) return;


try {
  const payload = {
    weekNumber: selectedWeek.weekNumber,
    scores: grades.flatMap((g) =>
      data[g].map((c) => ({
        className: c.className,
        grade: c.grade,
        scores: c.scores,
        totalScore: calculateTotal(c.scores),
      }))
    ),
  };

  await api.post("/api/class-hygiene-scores", payload);
  setSnackbar({
    open: true,
    message: "Đã lưu điểm vệ sinh thành công!",
    severity: "success",
  });
} catch (err) {
  console.error("Lỗi khi lưu:", err);
  setSnackbar({
    open: true,
    message: "Lỗi khi lưu điểm.",
    severity: "error",
  });
}

};

const renderTable = (grade: string) => {
if (!data[grade]) return null;
const days =
selectedWeek?.startDate ? getWeekDays(selectedWeek.startDate) : [];


return (
  <Paper key={grade} sx={{ p: 2, minWidth: 400 }}>
    <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
      Khối {grade}
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
          <TableCell>Lớp</TableCell>
          {days.map((dayLabel, dIdx) => (
            <TableCell key={dIdx} align="center">
              {dayLabel}
              <br />
              (Sáng/Chiều)
            </TableCell>
          ))}
          <TableCell align="center">Tổng</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data[grade].map((cls, idx) => (
          <TableRow key={cls.className}>
            <TableCell sx={{ fontWeight: "bold" }}>
              {cls.className}
            </TableCell>
            {days.map((_, dIdx) => (
              <TableCell key={dIdx} align="center">
                {["Sáng", "Chiều"].map((session, sIdx) => (
                  <Box
                    key={sIdx}
                    sx={{ display: "flex", gap: 1, justifyContent: "center" }}
                  >
                    {[0, 1, 2].map((violation, vIdx) => {
                      const index = dIdx * 6 + sIdx * 3 + vIdx;
                      return (
                        <Checkbox
                          key={vIdx}
                          checked={cls.scores[index] === 1}
                          onChange={() =>
                            handleCheck(grade, idx, index)
                          }
                          size="small"
                        />
                      );
                    })}
                  </Box>
                ))}
              </TableCell>
            ))}
            <TableCell align="center">
              {calculateTotal(cls.scores)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Paper>
);

};

return (
<Box sx={{ p: 3 }}> <Typography variant="h5" fontWeight="bold" gutterBottom>
🧹 Nhập điểm vệ sinh lớp theo tuần </Typography>

  <Stack direction="row" spacing={2} mb={2} alignItems="center">
    <TextField
      select
      label="Chọn tuần"
      value={selectedWeek?._id || ""}
      onChange={(e) => {
        const w = weekList.find((w) => w._id === e.target.value);
        setSelectedWeek(w || null);
        if (w) initializeData(w.weekNumber);
      }}
      sx={{ width: 220 }}
    >
      {weekList.map((w) => (
        <MenuItem key={w._id} value={w._id}>
          Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString("vi-VN")} -{" "}
          {new Date(w.endDate).toLocaleDateString("vi-VN")})
        </MenuItem>
      ))}
    </TextField>
  </Stack>

  <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
    {grades.map((grade) => (
      <Box key={grade} sx={{ flex: "1 1 400px" }}>
        {renderTable(grade)}
      </Box>
    ))}
  </Stack>

  <Button
    variant="contained"
    color="success"
    onClick={handleSave}
    sx={{ mt: 3 }}
  >
    💾 Lưu điểm vệ sinh
  </Button>

  <Snackbar
    open={snackbar.open}
    autoHideDuration={3000}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
  >
    <Alert severity={snackbar.severity as any}>{snackbar.message}</Alert>
  </Snackbar>
</Box>

);
}
