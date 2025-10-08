
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Stack,
  Autocomplete,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name: string;
}

interface StudentOption {
  _id: string;
  name: string;
  className: string;
}

const VIOLATION_OPTIONS = [
  "Xếp hàng ồn ào",
  "Không đúng hàng quy định",
  "Tập trung trễ giờ",
];

const RECORDER_OPTIONS = ["Thầy Huy", "Thầy Năm", "Thầy Nghĩa"];

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentInput, setStudentInput] = useState<string>("");
  const [studentSuggestions, setStudentSuggestions] = useState<StudentOption[]>(
    []
  );
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null
  );
  const [selectedViolation, setSelectedViolation] = useState<string>("");
  const [recorder, setRecorder] = useState<string>(RECORDER_OPTIONS[0]);
  const [recordedAt, setRecordedAt] = useState<string>("");
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Load danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  // Gợi ý học sinh theo lớp
  useEffect(() => {
    const fetchStudents = async () => {
      if (!studentInput || !selectedClass) return;
      try {
        const res = await api.get("/api/students", {
          params: { className: selectedClass, name: studentInput },
        });
        setStudentSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi khi tìm học sinh:", err);
      }
    };
    fetchStudents();
  }, [studentInput, selectedClass]);

  // Ghi nhận vi phạm
  const handleSubmit = async () => {
    if (!selectedClass || !selectedStudent || !selectedViolation) {
      setSnackbar({
        open: true,
        message: "Vui lòng nhập đầy đủ thông tin!",
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        className: selectedClass,
        studentId: selectedStudent._id,
        violationName: selectedViolation,
        recorder,
        recordedAt: recordedAt || new Date().toISOString(),
      };

      await api.post("/api/class-lineup-summaries", payload);

      setSnackbar({
        open: true,
        message: "Ghi nhận vi phạm thành công!",
        severity: "success",
      });

      // Reset sau khi lưu
      setSelectedStudent(null);
      setStudentInput("");
      setSelectedViolation("");
      setRecordedAt("");
    } catch (err) {
      console.error("Lỗi khi ghi nhận:", err);
      setSnackbar({
        open: true,
        message: "Không thể ghi nhận vi phạm!",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mx: "auto", mt: 5 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Ghi nhận vi phạm xếp hàng đầu giờ
      </Typography>

      <Stack spacing={3}>
        {/* Chọn lớp */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Chọn lớp
          </Typography>
          {loadingClasses ? (
            <CircularProgress size={24} />
          ) : (
            <Select
              fullWidth
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>-- Chọn lớp --</em>
              </MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls._id} value={cls.name}>
                  {cls.name}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>

        {/* Học sinh */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Học sinh vi phạm
          </Typography>
          <Autocomplete
            options={studentSuggestions}
            getOptionLabel={(option) => option.name}
            value={selectedStudent}
            inputValue={studentInput}
            onInputChange={(_, newValue) => setStudentInput(newValue)}
            onChange={(_, newValue) => setSelectedStudent(newValue)}
            renderInput={(params) => (
              <TextField {...params} placeholder="Nhập tên học sinh..." />
            )}
            noOptionsText="Không có học sinh phù hợp"
          />
        </Box>

        {/* Lỗi vi phạm */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Lỗi vi phạm
          </Typography>
          <Select
            fullWidth
            value={selectedViolation}
            onChange={(e) => setSelectedViolation(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>-- Chọn lỗi --</em>
            </MenuItem>
            {VIOLATION_OPTIONS.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Người ghi nhận */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Người ghi nhận
          </Typography>
          <Select
            fullWidth
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
          >
            {RECORDER_OPTIONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Thời gian ghi nhận */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Thời gian ghi nhận
          </Typography>
          <TextField
            fullWidth
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
          />
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Ghi nhận vi phạm"}
        </Button>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

