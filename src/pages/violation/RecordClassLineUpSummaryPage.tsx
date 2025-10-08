import { useEffect, useState } from "react";
import {
Box,
Button,
TextField,
MenuItem,
Typography,
Paper,
Stack,
Table,
TableHead,
TableRow,
TableCell,
TableBody,
IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../api/api";

interface StudentSuggestion {
_id: string;
name: string;
className: string;
}

interface ViolationRecord {
_id: string;
className: string;
studentName: string;
violation: string;
date: string;
recorder: string;
}

export default function RecordClassLineUpSummaryPage() {
const [className, setClassName] = useState("");
const [classes, setClasses] = useState<string[]>([]);
const [studentName, setStudentName] = useState("");
const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
const [violation, setViolation] = useState("");
const [recorder, setRecorder] = useState("th Huy");
const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
const [records, setRecords] = useState<ViolationRecord[]>([]);

// 🔹 Load danh sách lớp
useEffect(() => {
const loadClasses = async () => {
try {
const res = await api.get("/api/classes");
setClasses(res.data.map((c: any) => c.className));
} catch (err) {
console.error("Lỗi khi tải danh sách lớp:", err);
}
};
loadClasses();
}, []);

// 🔹 Gợi ý học sinh theo lớp và tên
useEffect(() => {
if (!studentName.trim() || !className) {
setSuggestions([]);
return;
}
const delayDebounce = setTimeout(async () => {
try {
const res = await api.get("/api/students/search", {
params: { name: studentName, className },
});
setSuggestions(res.data);
} catch (err) {
console.error("Lỗi tìm học sinh:", err);
}
}, 300);
return () => clearTimeout(delayDebounce);
}, [studentName, className]);

// 🔹 Lấy danh sách vi phạm trong tuần
const loadWeeklyViolations = async () => {
try {
const res = await api.get("/api/class-lineup-summaries/weekly-summary");
setRecords(res.data);
} catch (err) {
console.error("Lỗi khi lấy danh sách vi phạm:", err);
}
};
useEffect(() => {
loadWeeklyViolations();
}, []);

// 🔹 Ghi nhận vi phạm (mỗi lỗi = +10 điểm)
const handleSave = async () => {
if (!className || !violation || !recorder)
return alert("Vui lòng nhập đủ thông tin");

```
try {
  const payload = {
    className,
    date: new Date(date),
    violation,
    recorder,
    studentName: selectedStudents.join(", "),
    scoreChange: 10,
  };
  await api.post("/api/class-lineup-summaries", payload);
  setStudentName("");
  setSelectedStudents([]);
  setViolation("");
  loadWeeklyViolations();
} catch (err) {
  console.error("Lỗi ghi nhận:", err);
  alert("Ghi nhận thất bại!");
}
```

};

// 🔹 Xóa vi phạm → trừ 10 điểm
const handleDelete = async (id: string) => {
if (!window.confirm("Xóa vi phạm này?")) return;
try {
await api.delete(`/api/class-lineup-summaries/${id}`);
setRecords((prev) => prev.filter((r) => r._id !== id));
} catch (err) {
console.error("Lỗi xóa vi phạm:", err);
}
};

return ( <Box p={3}> <Typography variant="h5" mb={2}>
Ghi nhận lỗi xếp hàng </Typography>

```
  <Paper sx={{ p: 3, mb: 3 }}>
    <Stack spacing={2}>
      {/* --- Lớp --- */}
      <TextField
        select
        label="Lớp"
        value={className}
        onChange={(e) => {
          setClassName(e.target.value);
          setSelectedStudents([]);
        }}
      >
        {classes.map((cls) => (
          <MenuItem key={cls} value={cls}>
            {cls}
          </MenuItem>
        ))}
      </TextField>

      {/* --- Học sinh vi phạm --- */}
      <Box>
        <TextField
          fullWidth
          label="Học sinh vi phạm"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Nhập tên để gợi ý..."
        />
        {suggestions.length > 0 && (
          <Paper
            sx={{
              position: "absolute",
              zIndex: 10,
              mt: 0.5,
              width: "100%",
              maxHeight: 160,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <MenuItem
                key={s._id}
                onClick={() => {
                  if (!selectedStudents.includes(s.name)) {
                    setSelectedStudents((prev) => [...prev, s.name]);
                  }
                  setStudentName("");
                  setSuggestions([]);
                }}
              >
                {s.name}
              </MenuItem>
            ))}
          </Paper>
        )}
        <Stack direction="row" spacing={1} mt={1}>
          {selectedStudents.map((s) => (
            <Paper
              key={s}
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: "#f5f5f5",
                borderRadius: "8px",
                fontSize: "0.9rem",
              }}
            >
              {s}
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* --- Lỗi vi phạm --- */}
      <TextField
        select
        fullWidth
        label="Lỗi vi phạm"
        value={violation}
        onChange={(e) => setViolation(e.target.value)}
      >
        <MenuItem value="Tập trung xếp hàng quá thời gian quy định">
          Tập trung xếp hàng quá thời gian quy định
        </MenuItem>
        <MenuItem value="Mất trật tự, đùa giỡn khi xếp hàng">
          Mất trật tự, đùa giỡn khi xếp hàng
        </MenuItem>
        <MenuItem value="Di chuyển lộn xộn không theo hàng lối">
          Di chuyển lộn xộn không theo hàng lối
        </MenuItem>
      </TextField>

      {/* --- Người ghi nhận --- */}
      <TextField
        select
        label="Người ghi nhận"
        value={recorder}
        onChange={(e) => setRecorder(e.target.value)}
      >
        <MenuItem value="th Huy">th Huy</MenuItem>
        <MenuItem value="th Nghĩa">th Nghĩa</MenuItem>
        <MenuItem value="th Năm">th Năm</MenuItem>
      </TextField>

      {/* --- Thời gian --- */}
      <TextField
        type="date"
        label="Ngày ghi nhận"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />

      <Button variant="contained" onClick={handleSave}>
        Lưu ghi nhận (+10 điểm)
      </Button>
    </Stack>
  </Paper>

  {/* --- Danh sách vi phạm trong tuần --- */}
  {records.length > 0 && (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={1}>
        Danh sách vi phạm trong tuần
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            <TableCell>Học sinh</TableCell>
            <TableCell>Lỗi vi phạm</TableCell>
            <TableCell>Ngày</TableCell>
            <TableCell>Người ghi nhận</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r._id}>
              <TableCell>{r.className}</TableCell>
              <TableCell>{r.studentName || "-"}</TableCell>
              <TableCell>{r.violation}</TableCell>
              <TableCell>
                {new Date(r.date).toLocaleDateString("vi-VN")}
              </TableCell>
              <TableCell>{r.recorder}</TableCell>
              <TableCell>
                <IconButton color="error" onClick={() => handleDelete(r._id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )}
</Box>
```

);
}
