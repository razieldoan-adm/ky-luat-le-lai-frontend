import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Stack,
  MenuItem,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../api/api";

/* ================= INTERFACE ================= */
interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

interface EarlyLeaveStudent {
  _id: string;
  name: string;
  className: string;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

/* ================= UTILS ================= */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

/* ================= VOICE ================= */
let recognition: any = null;
let stopTimer: any = null;

export default function EarlyLeaveStudentListPage() {
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [students, setStudents] = useState<EarlyLeaveStudent[]>([]);
  const [tempStudents, setTempStudents] = useState<EarlyLeaveStudent[]>([]);

  const [filterClass, setFilterClass] = useState(""); // chưa chọn lớp
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  /* ================= INIT VOICE ================= */
  useEffect(() => {
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SR) return;

    recognition = new SR();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = true;
  }, []);

  /* ================= START VOICE ================= */
  const startVoice = () => {
    if (!recognition) return;

    setIsListening(true);
    recognition.start();

    recognition.onresult = async (event: any) => {
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }

      if (!finalText) return;

      setName(finalText);

      const params = new URLSearchParams();
      params.append("name", finalText.trim());
      params.append("normalizedName", normalize(finalText));

      try {
        const res = await api.get(
          `/api/students/search?${params.toString()}`
        );
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      }

      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => recognition.stop(), 200);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  /* ================= SEARCH TEXT ================= */
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const t = setTimeout(() => {
      const params = new URLSearchParams();
      params.append("name", name.trim());
      params.append("normalizedName", normalize(name));

      api
        .get(`/api/students/search?${params.toString()}`)
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(t);
  }, [name]);

  /* ================= LOAD CLASSES ================= */
  useEffect(() => {
    api
      .get("/api/classes/with-teacher")
      .then((res) => setClassOptions(res.data))
      .catch(console.error);
  }, []);

  /* ================= LOAD STUDENTS BY CLASS ================= */
  useEffect(() => {
    if (!filterClass) return;

    // ❗ chọn lớp → xoá danh sách tạm
    setTempStudents([]);

    api
      .get("/api/early-leave/students/by-class", {
        params: { className: filterClass },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
  }, [filterClass]);

  /* ================= ADD STUDENT ================= */
  const handleAddStudent = async (s: StudentSuggestion) => {
    const nName = normalize(s.name);

    const isDuplicate =
      tempStudents.some(
        (st) =>
          normalize(st.name) === nName &&
          st.className === s.className
      ) ||
      students.some(
        (st) =>
          normalize(st.name) === nName &&
          st.className === s.className
      );

    if (isDuplicate) {
      setErrorMsg("❌ Học sinh này đã có trong danh sách");
      return;
    }

    try {
      const res = await api.post("/api/early-leave/students", {
        name: s.name,
        className: s.className,
      });

      // 👉 chỉ hiển thị TẠM
      setTempStudents((prev) => [...prev, res.data]);

      setName("");
      setSuggestions([]);
      setErrorMsg("");

      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMsg("❌ Học sinh đã tồn tại trong CSDL");
      }
    }
  };

  /* ================= AUTO CLEAR TEMP (30s) ================= */
  useEffect(() => {
    if (tempStudents.length === 0) return;

    const timer = setTimeout(() => {
      setTempStudents([]);
    }, 30000);

    return () => clearTimeout(timer);
  }, [tempStudents]);

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa học sinh này khỏi danh sách?")) return;

    await api.delete(`/api/early-leave/students/${id}`);

    if (filterClass) {
      const res = await api.get(
        "/api/early-leave/students/by-class",
        { params: { className: filterClass } }
      );
      setStudents(res.data);
    }
  };

  /* ================= DISPLAY ================= */
  const displayStudents =
    tempStudents.length > 0 ? tempStudents : students;

  return (
    <Box sx={{ width: "75vw", py: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Danh sách học sinh xin ra về sớm
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Nói hoặc nhập tên học sinh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />

        {errorMsg && (
          <Typography color="error" fontWeight="bold">
            {errorMsg}
          </Typography>
        )}

        <Button
          variant={isListening ? "contained" : "outlined"}
          color={isListening ? "error" : "secondary"}
          onClick={startVoice}
        >
          {isListening ? "🎙️ Đang nghe..." : "🎤 Nói tên học sinh"}
        </Button>

        {suggestions.length > 0 && (
          <Paper>
            <List>
              {suggestions.map((s) => (
                <ListItemButton
                  key={s._id}
                  onClick={() => handleAddStudent(s)}
                >
                  <ListItemText
                    primary={s.name}
                    secondary={`Lớp: ${s.className}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        <Divider />

        <TextField
          select
          label="Xem danh sách theo lớp"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <MenuItem value="">-- Chọn lớp --</MenuItem>
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className} — {cls.teacher}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="h6" ref={listRef}>
          Danh sách học sinh
        </Typography>

        {displayStudents.length > 0 ? (
          <Paper>
            <List>
              {displayStudents.map((s, i) => {
                const isTemp = tempStudents.some(
                  (t) => t._id === s._id
                );

                return (
                  <ListItem
                    key={s._id}
                    sx={{
                      backgroundColor: isTemp ? "#e3f2fd" : "transparent",
                      borderLeft: isTemp
                        ? "5px solid #1976d2"
                        : "none",
                    }}
                    secondaryAction={
                      filterClass && (
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDelete(s._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <>
                          {i + 1}. {s.name}
                          {isTemp && (
                            <Typography
                              component="span"
                              sx={{
                                ml: 1,
                                color: "primary.main",
                                fontWeight: "bold",
                              }}
                            >
                              (Vừa thêm)
                            </Typography>
                          )}
                        </>
                      }
                      secondary={`Lớp: ${s.className}`}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        ) : (
          <Typography color="text.secondary">
            Chưa có học sinh để hiển thị
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
