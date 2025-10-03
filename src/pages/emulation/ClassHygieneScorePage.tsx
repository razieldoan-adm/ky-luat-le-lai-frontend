```tsx
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
  scores: number[][][]; // [ngày][buổi][loại lỗi]
}

const grades = ["6", "7", "8", "9"];
const days = ["T2", "T3", "T4", "T5", "T6"];
const sessions = ["Sáng", "Chiều"];
const violationTypes = [
  "Không dọn vệ sinh",
  "Không tắt đèn/quạt",
  "Không đóng cửa lớp",
];

export default function ClassHygieneScorePage() {
  const [weekList, setWeekList] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [data, setData] = useState<{ [key: string]: ClassType[] }>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [hygienePoint, setHygienePoint] = useState<number>(1); // mỗi vi phạm trừ 1 điểm

  useEffect(() => {
    fetchWeeks();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      setHygienePoint(res.data.disciplinePointDeduction?.hygiene || 1);
    } catch (err) {
      console.error("Lỗi khi lấy settings:", err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
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
          scores: Array(5)
            .fill(0)
            .map(() =>
              Array(2)
                .fill(0)
                .map(() => Array(3).fill(0))
            ), // [ngày][buổi][loại lỗi]
        });
      }
      initial[grade] = classes;
    });

    try {
      const res = await api.get("/api/class-hygiene-scores", {
        params: { weekNumber },
      });

      res.data.forEach((cls: any) => {
        const target = initial[cls.grade]?.find(
          (c) => c.className === cls.className
        );
        if (target) {
          target.scores = cls.scores || target.scores;
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
    dayIdx: number,
    sessionIdx: number,
    typeIdx: number
  ) => {
    const updated = { ...data };
    updated[grade][classIdx].scores[dayIdx][sessionIdx][typeIdx] =
      updated[grade][classIdx].scores[dayIdx][sessionIdx][typeIdx] === 1
        ? 0
        : 1;
    setData(updated);
  };

  const calculateTotal = (scores: number[][][]) => {
    const count = scores
      .flat(2)
      .reduce((acc: number, cur: number) => acc + cur, 0);
    return count * hygienePoint;
  };

  const handleSave = async () => {
    if (!selectedWeek) return;

    try {
      const payload = {
        weekNumber: selectedWeek.weekNumber,
        scores: grades.flatMap((g) =>
          data[g].map((c) => ({
            className: c.className,
            grade: c.grade,
            scores: c.scores, // ✅ lưu full mảng [ngày][buổi][loại lỗi]
            total: calculateTotal(c.scores),
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

    return (
      <Paper key={grade} sx={{ p: 2, minWidth: 600 }}>
        <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
          Khối {grade}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Lớp</TableCell>
              {days.map((d) => (
                <TableCell key={d} align="center" colSpan={sessions.length * violationTypes.length}>
                  {d}
                </TableCell>
              ))}
              <TableCell align="center">Tổng</TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              <TableCell />
              {days.map((d, dayIdx) =>
                sessions.flatMap((s, sessionIdx) =>
                  violationTypes.map((v, typeIdx) => (
                    <TableCell
                      key={`${d}-${s}-${v}`}
                      align="center"
                      sx={{ fontSize: 11 }}
                    >
                      {d} {s} - {typeIdx + 1}
                    </TableCell>
                  ))
                )
              )}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {data[grade].map((cls, classIdx) => (
              <TableRow key={cls.className}>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {cls.className}
                </TableCell>
                {days.map((d, dayIdx) =>
                  sessions.flatMap((s, sessionIdx) =>
                    violationTypes.map((v, typeIdx) => (
                      <TableCell key={`${dayIdx}-${sessionIdx}-${typeIdx}`} align="center">
                        <Checkbox
                          checked={
                            cls.scores?.[dayIdx]?.[sessionIdx]?.[typeIdx] === 1
                          }
                          onChange={() =>
                            handleCheck(
                              grade,
                              classIdx,
                              dayIdx,
                              sessionIdx,
                              typeIdx
                            )
                          }
                        />
                      </TableCell>
                    ))
                  )
                )}
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        🧹 Nhập điểm vệ sinh lớp theo tuần
      </Typography>

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
          sx={{ width: 180 }}
        >
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        {grades.map((grade) => (
          <Box key={grade} sx={{ flex: "1 1 600px" }}>
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
```
