import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name: string;
}

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
  recorder: string;
  date: string;
}

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [violation, setViolation] = useState("");
  const [recorder, setRecorder] = useState("Thầy Huy");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // 📌 Load danh sách lớp
  useEffect(() => {
    api
      .get("/api/classes")
      .then((res) => setClasses(res.data))
      .catch((err) => console.error("Lỗi load lớp:", err));
  }, []);

  // 📌 Gợi ý học sinh
  useEffect(() => {
    if (!studentName.trim() || !selectedClass.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams({
        name: studentName.trim(),
        className: selectedClass.trim(),
      });
      api
        .get(`/api/students/search?${params.toString()}`)
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [studentName, selectedClass]);

  // 📌 Lấy danh sách vi phạm
  const loadViolations = async () => {
    try {
      const res = await api.get("/api/class-lineup-summaries");
      setRecords(res.data);
    } catch (err) {
      console.error("Lỗi load vi phạm:", err);
    }
  };

  useEffect(() => {
    loadViolations();
  }, []);

  // 📌 Ghi nhận vi phạm
  const handleSubmit = async () => {
    if (!selectedClass || !selectedStudents.length || !violation) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn lớp, học sinh và lỗi vi phạm.",
        severity: "error",
      });
      return;
    }

    try {
      for (const name of selectedStudents) {
        await api.post("/api/class-lineup-summaries", {
          className: selectedClass,
          studentName: name,
          violation,
          recorder,
          date: new Date(date),
        });
      }

      setSnackbar({ open: true, message: "Đã ghi nhận vi phạm.", severity: "success" });
      setSelectedStudents([]);
      setStudentName("");
      setViolation("");
      loadViolations();
    } catch (err) {
      console.error("Lỗi ghi nhận:", err);
      setSnackbar({ open: true, message: "Lỗi ghi nhận vi phạm.", severity: "error" });
    }
  };

  // 📌 Xóa vi phạm
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Lỗi xóa:", err);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2} fontWeight="bold">
        Ghi nhận lỗi xếp hàng
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Lớp */}
          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <MenuItem key={c._id} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Học sinh */}
          <Box>
            <TextField
              label="Tên học sinh"
              fullWidth
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            {suggestions.length > 0 && (
              <List dense>
                {suggestions.map((s) => (
                  <ListItemButton
                    key={s._id}
                    onClick={() => {
                      if (!selectedStudents.includes(s.name)) {
                        setSelectedStudents([...selectedStudents, s.name]);
                      }
                      setSuggestions([]);
                      setStudentName("");
                    }}
                  >
                    <ListItemText primary={`${s.name} (${s.className})`} />
                  </ListItemButton>
                ))}
              </List>
            )}
            {selectedStudents.length > 0 && (
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                {selectedStudents.map((name) => (
                  <Paper
                    key={name}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      bgcolor: "#f3f3f3",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography>{name}</Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        setSelectedStudents(selectedStudents.filter((n) => n !== name))
                      }
                    >
                      x
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          {/* Lỗi vi phạm */}
          <TextField
            select
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
            fullWidth
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

          {/* Người ghi nhận */}
          <TextField
            select
            label="Người ghi nhận"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            fullWidth
          >
            <MenuItem value="Thầy Huy">Thầy Huy</MenuItem>
            <MenuItem value="Thầy Nghĩa">Thầy Nghĩa</MenuItem>
            <MenuItem value="Thầy Năm">Thầy Năm</MenuItem>
          </TextField>

          {/* Thời gian */}
          <TextField
            label="Thời gian"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
          />

          {/* Nút lưu */}
          <Button variant="contained" onClick={handleSubmit}>
            Lưu vi phạm
          </Button>
        </Stack>
      </Paper>

      {/* Danh sách vi phạm */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          Danh sách vi phạm
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Học sinh</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Người ghi nhận</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.studentName}</TableCell>
                <TableCell>{r.violation}</TableCell>
                <TableCell>{r.recorder}</TableCell>
                <TableCell>{new Date(r.date).toLocaleString("vi-VN")}</TableCell>
                <TableCell>
                  <Button color="error" onClick={() => handleDelete(r._id)}>
                    Xóa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity as "success" | "error"} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
