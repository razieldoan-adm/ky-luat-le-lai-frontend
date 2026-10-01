
// src/pages/violation/RecordAttendancePage.tsx
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Snackbar,
  Alert,
  IconButton,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Check, Delete, Mic, MicOff } from "@mui/icons-material";
import dayjs from "dayjs";
import api from "../../api/api";

export default function RecordAttendancePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  // 🎤 Nhận diện tên học sinh bằng giọng nói
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  
  // 🔹 Dữ liệu nhập ghi nhận
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [session, setSession] = useState("sáng");

  // 🔹 Dữ liệu xem danh sách
  const [records, setRecords] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [viewDate, setViewDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [viewWeek, setViewWeek] = useState<number | null>(null);
  const [studyWeeks, setStudyWeeks] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [selectedClassView, setSelectedClassView] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: any }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [consecutiveDialogOpen, setConsecutiveDialogOpen] =
  useState(false);

  const [consecutiveInfo, setConsecutiveInfo] = useState<{
    studentId: string;
    studentName: string;
    className: string;
    dates: string[];
    recordIds: string[];
  } | null>(null);
  
  const [consecutiveProcessing, setConsecutiveProcessing] = useState(false);
   // Chuẩn hóa tên để so sánh không dấu
  const normalizeName = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim(); 

  // 🎤 Gọi tên học sinh bằng giọng nói
const handleVoiceStudentRecognition = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setSnackbar({
      open: true,
      message:
        "Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Google Chrome hoặc Microsoft Edge.",
      severity: "warning",
    });
    return;
  }

  // Nếu đang nghe thì dừng
  if (isListening) {
    speechRecognitionRef.current?.stop();
    return;
  }

  // Phải chọn lớp trước
  if (!className) {
    setSnackbar({
      open: true,
      message: "Vui lòng chọn lớp trước khi gọi tên học sinh.",
      severity: "warning",
    });
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    setIsListening(true);

    setSnackbar({
      open: true,
      message: "🎤 Đang nghe... Hãy đọc tên học sinh.",
      severity: "info",
    });
  };

  recognition.onresult = async (event: any) => {
    try {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() || "";

      if (!transcript) return;

      console.log("🎤 Tên nhận diện:", transcript);

      setStudentInput(transcript);

      // Tìm trực tiếp trên server theo tên vừa đọc
      const res = await api.get("/api/students/search", {
        params: {
          name: transcript,
          className,
        },
      });

      const foundStudents = Array.isArray(res.data)
        ? res.data
        : [];

      const normalizedSpokenName = normalizeName(transcript);

      // 1. Ưu tiên khớp chính xác
      let found = foundStudents.find(
        (student: any) =>
          normalizeName(student.name || "") ===
          normalizedSpokenName
      );

      // 2. Nếu không khớp tuyệt đối thì tìm tên gần đúng
      if (!found) {
        found = foundStudents.find((student: any) => {
          const studentName = normalizeName(student.name || "");

          return (
            studentName.includes(normalizedSpokenName) ||
            normalizedSpokenName.includes(studentName)
          );
        });
      }

      setSuggestions(foundStudents);

      if (found) {
        setSelectedStudent(found);
        setStudentInput(found.name);

        setSnackbar({
          open: true,
          message: `✅ Đã nhận diện: ${found.name}`,
          severity: "success",
        });
      } else if (foundStudents.length === 1) {
        // Nếu server chỉ trả về đúng 1 học sinh
        const onlyStudent = foundStudents[0];

        setSelectedStudent(onlyStudent);
        setStudentInput(onlyStudent.name);

        setSnackbar({
          open: true,
          message: `✅ Đã chọn: ${onlyStudent.name}`,
          severity: "success",
        });
      } else {
        setSelectedStudent(null);

        setSnackbar({
          open: true,
          message: `Không tìm thấy học sinh "${transcript}" trong lớp ${className}.`,
          severity: "warning",
        });
      }
    } catch (error) {
      console.error("❌ Lỗi nhận diện học sinh:", error);

      setSnackbar({
        open: true,
        message: "Không thể tìm học sinh sau khi nhận diện giọng nói.",
        severity: "error",
      });
    }
  };

  recognition.onerror = (event: any) => {
    console.error("❌ Speech recognition error:", event);

    setIsListening(false);

    let message = "Không nhận diện được giọng nói.";

    if (event?.error === "not-allowed") {
      message =
        "Trình duyệt chưa được cấp quyền sử dụng microphone.";
    } else if (event?.error === "no-speech") {
      message = "Không nghe thấy giọng nói. Hãy thử lại.";
    }

    setSnackbar({
      open: true,
      message,
      severity: "warning",
    });
  };

  recognition.onend = () => {
    setIsListening(false);
    speechRecognitionRef.current = null;
  };

  speechRecognitionRef.current = recognition;

  try {
    recognition.start();
  } catch (error) {
    console.error("❌ Không thể khởi động microphone:", error);
    setIsListening(false);
  }
};
  // --- Load danh sách lớp (chỉ phục vụ ghi nhận)
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("❌ Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
  return () => {
    speechRecognitionRef.current?.stop?.();
    };
  }, []);
  // --- Tự động chọn tuần hiện tại khi mở trang
  useEffect(() => {
    fetchCurrentWeek();
  }, []);
  // --- Gợi ý học sinh theo lớp
  useEffect(() => {
    if (!studentInput.trim() || !className) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params: { name: studentInput.trim(), className },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("❌ Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentInput, className]);
  
  // --- Tự nhận diện tuần học hiện tại
const fetchCurrentWeek = async () => {
  try {
    const res = await api.get("/api/academic-weeks/study-weeks");

    const weeks = Array.isArray(res.data) ? res.data : [];

    setStudyWeeks(weeks);

    // Dùng ngày hiện tại theo múi giờ Việt Nam
    const today = dayjs();

    const currentWeekFound = weeks.find((week: any) => {
      if (!week.startDate || !week.endDate) return false;

      const start = dayjs(week.startDate).startOf("day");
      const end = dayjs(week.endDate).endOf("day");

      return (
        today.isSame(start) ||
        today.isSame(end) ||
        (today.isAfter(start) && today.isBefore(end))
      );
    });

    if (currentWeekFound) {
      const weekNumber = Number(currentWeekFound.weekNumber);

      if (Number.isInteger(weekNumber) && weekNumber > 0) {
        setCurrentWeek(weekNumber);
        setViewWeek(weekNumber);

        console.log(
          "📅 Tuần hiện tại:",
          weekNumber,
          currentWeekFound.startDate,
          "→",
          currentWeekFound.endDate
        );
      }
    } else {
      console.warn("⚠️ Không tìm thấy tuần học hiện tại.");
    }
  } catch (error) {
    console.error("❌ Lỗi lấy tuần hiện tại:", error);
  }
};
  
  // --- Lấy danh sách nghỉ học (toàn bộ, không theo lớp)
  const fetchRecords = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await api.get("/api/class-attendance-summaries/by-week", {
      params: { week: viewWeek, date: today },
    });
    const data = res.data.records || res.data || [];
    setRecords(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("❌ Lỗi tải danh sách:", err);
    setRecords([]);
  }
};


// --- Gọi lại khi bộ lọc thay đổi
useEffect(() => {
 if (viewMode === "week" && viewWeek) {
    fetchRecords();
  }
}, [viewMode, viewWeek]);

  // --- Ghi nhận nghỉ học
  const handleRecord = async () => {
    if (!selectedStudent || !className) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn lớp và học sinh!",
        severity: "error",
      });
      return;
    }

    try {
      const payload = {
        studentId: selectedStudent._id,
        studentName: selectedStudent.name,
        className,
        grade,
        date,
        session,
      };

      await api.post(`/api/class-attendance-summaries/`, payload);
      setSnackbar({
        open: true,
        message: "✅ Đã ghi nhận nghỉ học.",
        severity: "success",
      });

      await checkConsecutiveAbsence(
        selectedStudent._id,
        selectedStudent.name,
        className
      );
      
      setSelectedStudent(null);
      setStudentInput("");
      fetchRecords();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi ghi nhận nghỉ học.",
        severity: "error",
      });
    }
  };


  const checkConsecutiveAbsence = async (
  studentId: string,
  studentName: string,
  className: string
) => {
  try {
    const res = await api.get(
      `/api/class-attendance-summaries/consecutive/${studentId}`
    );

    if (!res.data?.hasConsecutive3Days) {
      return;
    }

    const records = res.data.records || [];

    setConsecutiveInfo({
      studentId,
      studentName,
      className,
      dates: res.data.dates || [],
      recordIds: records.map(
        (record: any) => String(record._id)
      ),
    });

    setConsecutiveDialogOpen(true);
  } catch (error) {
    console.error(
      "❌ Lỗi kiểm tra nghỉ liên tục:",
      error
    );
  }
};

const handleCountConsecutiveConduct = () => {
  setConsecutiveDialogOpen(false);
  setConsecutiveInfo(null);

  setSnackbar({
    open: true,
    message:
      "Đã xác nhận: các buổi nghỉ sẽ được tính vào hạnh kiểm khi duyệt.",
    severity: "info",
  });
};

  const handleConsecutiveException = async () => {
  if (!consecutiveInfo) return;

  try {
    setConsecutiveProcessing(true);

    for (const recordId of consecutiveInfo.recordIds) {
      await api.put(
        `/api/class-attendance-summaries/exception/${recordId}`,
        {
          isException: true,
          exceptionNote:
            "Nghỉ học liên tục 3 ngày - được cho phép ngoại lệ.",
        }
      );
    }

    setConsecutiveDialogOpen(false);

    setSnackbar({
      open: true,
      message:
        "Đã đánh dấu các buổi nghỉ liên tục là ngoại lệ. Các buổi này sẽ không bị trừ hạnh kiểm.",
      severity: "success",
    });

    setConsecutiveInfo(null);

    await fetchRecords();
  } catch (error) {
    console.error(
      "❌ Lỗi đánh dấu ngoại lệ:",
      error
    );

    setSnackbar({
      open: true,
      message: "Không thể đánh dấu ngoại lệ.",
      severity: "error",
    });
  } finally {
    setConsecutiveProcessing(false);
  }
};
  
  // --- Duyệt phép
  const handleExcuse = async (id: string) => {
    try {
      await api.put(`/api/class-attendance-summaries/approve/${id}`);
      setSnackbar({
        open: true,
        message: "✅ Đã duyệt phép cho học sinh.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi duyệt phép:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi duyệt phép.",
        severity: "error",
      });
    }
  };

  // --- Xóa ghi nhận
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa ghi nhận này không?")) return;
    try {
      await api.delete(`/api/class-attendance-summaries/${id}`);
      setSnackbar({
        open: true,
        message: "✅ Đã xóa ghi nhận.",
        severity: "success",
      });
      fetchRecords();
    } catch (err) {
      console.error("❌ Lỗi xóa:", err);
      setSnackbar({
        open: true,
        message: "Lỗi khi xóa ghi nhận.",
        severity: "error",
      });
    }
  };

  // --- Gom nhóm bản ghi theo lớp
  const groupedByClass = records.reduce((acc: any, rec: any) => {
    if (!acc[rec.className]) acc[rec.className] = [];
    acc[rec.className].push(rec);
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Ghi nhận chuyên cần
      </Typography>

      {/* --- Nhập dữ liệu ghi nhận --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Chọn lớp */}
          <TextField
            select
            label="Lớp"
            size="small"
            value={className}
            onChange={(e) => {
              const value = e.target.value;
              setClassName(value);
              const g = value.match(/^\d+/)?.[0] || "";
              setGrade(g);
            }}
            sx={{ width: 160 }}
          >
            {classes.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>

          {/* Học sinh */}
          <Stack direction="row" spacing={1} alignItems="center">
          <Autocomplete
            freeSolo
            options={suggestions}
            getOptionLabel={(s) => s.name || ""}
            inputValue={studentInput}
            onInputChange={(_, v) => setStudentInput(v)}
            onChange={(_, v) => {
              setSelectedStudent(v);
        
              if (v?.name) {
                setStudentInput(v.name);
              }
            }}
            sx={{ width: 250 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Học sinh nghỉ học"
                size="small"
              />
            )}
          />
        
          <IconButton
            color={isListening ? "error" : "primary"}
            onClick={handleVoiceStudentRecognition}
            title={
              isListening
                ? "Dừng nghe"
                : "Gọi tên học sinh bằng giọng nói"
            }
            sx={{
              border: "1px solid",
              borderColor: isListening
                ? "error.main"
                : "primary.main",
              width: 40,
              height: 40,
            }}
          >
            {isListening ? <MicOff /> : <Mic />}
          </IconButton>
        </Stack>

          {/* Ngày */}
          <TextField
            label="Ngày"
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {/* Buổi */}
          <TextField
            select
            label="Buổi"
            size="small"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            sx={{ width: 120 }}
          >
            <MenuItem value="sáng">Sáng</MenuItem>
            <MenuItem value="chiều">Chiều</MenuItem>
          </TextField>

          <Button variant="contained" color="primary" onClick={handleRecord}>
            Ghi nhận
          </Button>
        </Stack>
      </Paper>

      {/* --- Chế độ xem --- */}
      <Stack direction="column" spacing={2} mb={2}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography fontWeight="bold">Xem danh sách:</Typography>
          <ToggleButtonGroup
            size="small"
            color="primary"
            value={viewMode}
            exclusive
            onChange={(_e, v) => v && setViewMode(v)}
          >
            <ToggleButton value="week">Theo tuần</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {viewMode === "day" && (
          <TextField
            label="Chọn ngày xem"
            type="date"
            size="small"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            sx={{ width: 200 }}
          />
        )}

        {viewMode === "week" && (
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Chọn tuần"
              select
              size="small"
              value={viewWeek || ""}
              onChange={(e) => setViewWeek(Number(e.target.value))}
              sx={{ width: 220 }}
            >
              {studyWeeks.map((week: any) => (
                <MenuItem
                  key={week.weekNumber}
                  value={Number(week.weekNumber)}
                >
                  Tuần {week.weekNumber}
                  {Number(week.weekNumber) === currentWeek
                    ? " ⭐ Hiện tại"
                    : ""}
                </MenuItem>
              ))}
            </TextField>
        
            {currentWeek && (
              <Typography
                sx={{
                  fontWeight: "bold",
                  color: "success.main",
                }}
              >
                Đang xem: Tuần {currentWeek}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      {/* --- Hiển thị danh sách nghỉ học theo lớp --- */}
      {Object.keys(groupedByClass).length === 0 ? (
        <Typography color="gray" mt={2}>
          Không có học sinh nghỉ học trong thời gian này.
        </Typography>
      ) : (
        <Box>
          <Typography fontWeight="bold" mb={1}>
            Các lớp có học sinh nghỉ học:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
            {Object.keys(groupedByClass).map((cls) => (
              <Button
                key={cls}
                variant={selectedClassView === cls ? "contained" : "outlined"}
                onClick={() => setSelectedClassView(cls)}
              >
                {cls} ({groupedByClass[cls].length})
              </Button>
            ))}
          </Stack>

          {selectedClassView && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Danh sách nghỉ học - {selectedClassView}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>STT</TableCell>
                      <TableCell>Họ tên</TableCell>
                      <TableCell>Buổi</TableCell>
                      <TableCell>Ngày</TableCell>
                      <TableCell>Phép</TableCell>
                      <TableCell>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedByClass[selectedClassView].map((r: any, i: number) => (
                      <TableRow key={r._id || i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{r.studentName}</TableCell>
                        <TableCell>{r.session}</TableCell>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>
                          {r.permission ? (
                            <Typography color="green">Có phép</Typography>
                          ) : (
                            <Typography color="error">Không phép</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {!r.permission && (
                              <IconButton color="success" onClick={() => handleExcuse(r._id)}>
                                <Check />
                              </IconButton>
                            )}
                            <IconButton color="error" onClick={() => handleDelete(r._id)}>
                              <Delete />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}
            {/* --- Cảnh báo nghỉ học liên tục 3 ngày --- */}
      <Dialog
        open={consecutiveDialogOpen}
        onClose={() => {
          if (!consecutiveProcessing) {
            setConsecutiveDialogOpen(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ⚠️ CẢNH BÁO NGHỈ HỌC LIÊN TỤC
        </DialogTitle>

        <DialogContent>
          {consecutiveInfo && (
            <>
              <Typography
                sx={{
                  fontWeight: "bold",
                  mb: 1,
                }}
              >
                {consecutiveInfo.studentName} -{" "}
                {consecutiveInfo.className}
              </Typography>

              <Typography sx={{ mb: 1 }}>
                Học sinh đã nghỉ học liên tục:
              </Typography>

              <Typography
                sx={{
                  fontWeight: "bold",
                  mb: 2,
                }}
              >
                {consecutiveInfo.dates[0]}
                {" → "}
                {
                  consecutiveInfo.dates[
                    consecutiveInfo.dates.length - 1
                  ]
                }
              </Typography>

              <Typography>
                Vui lòng kiểm tra trường hợp này trước khi
                duyệt hạnh kiểm.
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: "warning.main",
                  fontWeight: "bold",
                }}
              >
                Nếu không cho phép ngoại lệ, các buổi nghỉ
                không phép sẽ được tính vào N1.
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCountConsecutiveConduct}
            disabled={consecutiveProcessing}
          >
            TÍNH VÀO HẠNH KIỂM
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={handleConsecutiveException}
            disabled={consecutiveProcessing}
          >
            {consecutiveProcessing
              ? "ĐANG XỬ LÝ..."
              : "CHO PHÉP NGOẠI LỆ"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- Thông báo --- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
