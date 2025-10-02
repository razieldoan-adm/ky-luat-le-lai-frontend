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

interface WeeklyScoreRow {
className: string;
grade: string;
weekNumber: number;
attendanceScore: number;
hygieneScore: number;
lineUpScore: number;
violationScore: number;
academicScore: number;
bonusScore: number;
totalViolation: number;
totalDiscipline: number;
totalScore: number;
ranking: number;
}

export default function WeeklyScoresPage() {
const [loading, setLoading] = useState(false);
const [week, setWeek] = useState<number | "">("");
const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
const [disciplineMax, setDisciplineMax] = useState<number>(100);
const [homeroomClasses, setHomeroomClasses] = useState<WeeklyScoreRow[]>([]);
const [localEdited, setLocalEdited] = useState(false);
const [externalChangeAvailable, setExternalChangeAvailable] = useState(false);

// helper: chuẩn hóa tên lớp
const normalizeClassName = (v: any) => String(v ?? "").trim().toUpperCase();

useEffect(() => {
const fetchWeeksWithData = async () => {
try {
const res = await api.get("/weekly-scores/weeks");
setWeeksWithData(res.data);
} catch (err) {
console.error("Lỗi khi lấy danh sách tuần:", err);
}
};

```
const fetchClasses = async () => {
  try {
    const res = await api.get("/api/classes/with-teacher");
    setHomeroomClasses(res.data);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách lớp:", err);
  }
};

fetchWeeksWithData();
fetchClasses();
```

}, []);

const handleLoadScores = async () => {
if (!week) return;
setLoading(true);
try {
const res = await api.get(`/weekly-scores?week=${week}`);
let data: WeeklyScoreRow[] = res.data || [];

```
  // lọc theo danh sách lớp có GVCN
  const allowed = new Set(
    homeroomClasses.map((c: any) => normalizeClassName(c.className))
  );
  data = data.filter((s) => allowed.has(normalizeClassName(s.className)));

  setScores(data);
  setLocalEdited(false);
  setExternalChangeAvailable(false);
} catch (err) {
  console.error("Lỗi khi load điểm:", err);
} finally {
  setLoading(false);
}
```

};

const handleScoreChange = (
idx: number,
field: "academicScore" | "bonusScore",
value: string
) => {
const num = parseInt(value) || 0;
setScores((prev) => {
const updated = [...prev];
(updated[idx] as any)[field] = num;

```
  // cập nhật lại totalScore
  updated[idx].totalScore =
    updated[idx].attendanceScore +
    updated[idx].hygieneScore +
    updated[idx].lineUpScore +
    updated[idx].violationScore +
    updated[idx].academicScore +
    updated[idx].bonusScore;

  return updated;
});
setLocalEdited(true);
```

};

const handleUpdate = async () => {
try {
await api.post("/weekly-scores/update", { week, scores });
setLocalEdited(false);
setExternalChangeAvailable(false);
} catch (err) {
console.error("Lỗi khi cập nhật:", err);
}
};

return ( <Box p={2}> <Typography variant="h5" gutterBottom>
Nhập điểm thi đua tuần </Typography>

```
  <Box display="flex" alignItems="center" gap={2} mb={2}>
    <Select
      value={week}
      onChange={(e) => setWeek(Number(e.target.value))}
      displayEmpty
    >
      <MenuItem value="">Chọn tuần</MenuItem>
      {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
        <MenuItem
          key={w}
          value={w}
          disabled={weeksWithData.includes(w)}
          style={{
            color: weeksWithData.includes(w) ? "gray" : "black",
          }}
        >
          Tuần {w}
        </MenuItem>
      ))}
    </Select>

    <Button
      variant="contained"
      disabled={!week || loading}
      onClick={handleLoadScores}
    >
      {loading ? <CircularProgress size={20} /> : "Tải dữ liệu"}
    </Button>
  </Box>

  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Lớp</TableCell>
          <TableCell>Khối</TableCell>
          <TableCell>Chuyên cần</TableCell>
          <TableCell>Vệ sinh</TableCell>
          <TableCell>Nề nếp</TableCell>
          <TableCell>Vi phạm</TableCell>
          <TableCell>Học tập</TableCell>
          <TableCell>Thưởng</TableCell>
          <TableCell>Tổng vi phạm</TableCell>
          <TableCell>Tổng kỷ luật</TableCell>
          <TableCell>Tổng điểm</TableCell>
          <TableCell>Xếp hạng</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {scores.map((row, idx) => (
          <TableRow
            key={row.className}
            style={{
              backgroundColor:
                row.ranking === 1
                  ? "#FFD700"
                  : row.ranking === 2
                  ? "#C0C0C0"
                  : row.ranking === 3
                  ? "#CD7F32"
                  : "inherit",
            }}
          >
            <TableCell>{row.className}</TableCell>
            <TableCell>{row.grade}</TableCell>
            <TableCell>{row.attendanceScore}</TableCell>
            <TableCell>{row.hygieneScore}</TableCell>
            <TableCell>{row.lineUpScore}</TableCell>
            <TableCell>{row.violationScore}</TableCell>
            <TableCell>
              <TextField
                type="number"
                value={row.academicScore}
                onChange={(e) =>
                  handleScoreChange(idx, "academicScore", e.target.value)
                }
                size="small"
              />
            </TableCell>
            <TableCell>
              <TextField
                type="number"
                value={row.bonusScore}
                onChange={(e) =>
                  handleScoreChange(idx, "bonusScore", e.target.value)
                }
                size="small"
              />
            </TableCell>
            <TableCell>{row.totalViolation}</TableCell>
            <TableCell>{row.totalDiscipline}</TableCell>
            <TableCell>{row.totalScore}</TableCell>
            <TableCell>{row.ranking}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>

  <Box mt={2}>
    <Button
      variant="contained"
      color="primary"
      disabled={!localEdited}
      onClick={handleUpdate}
    >
      Cập nhật
    </Button>
  </Box>
</Box>
```

);
}
