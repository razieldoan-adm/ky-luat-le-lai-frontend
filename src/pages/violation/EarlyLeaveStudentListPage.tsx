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
function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/* ================= VOICE ================= */
let recognition: any = null;
let stopTimer: any = null;

export default function EarlyLeaveStudentListPage() {
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [students, setStudents] = useState<EarlyLeaveStudent[]>([]);

  const [filterClass, setFilterClass] = useState(""); // ❗ rỗng = chưa chọn lớp
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [isListening, setIsListening] = useState(false);

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
      params.append(
        "normalizedName",
        removeVietnameseTones(finalText.trim())
      );

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
      params.append(
        "normalizedName",
        removeVietnameseTones(name.trim())
      );

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

  /* ================= LOAD STUDENTS (THEO LỚP) ================= */
  const loadStudents = () => {
    if (!filterClass) {
      setStudents([]);
      return;
    }

    api
      .get("/api/early-leave/students/by-class", {
        params: { className: filterClass },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
  };

  useEffect(() => {
    loadStudents();
  }, [filterClass]);

  /* ================= ADD STUDENT ================= */
  const handleAddStudent = async (s: StudentSuggestion) => {
  setErrorMsg("");

  try {
    await api.post("/api/early-leave/students", {
      name: s.name,
      className: s.className,
      normalizedName: removeVietnameseTones(s.name),
    });

    setName("");
    setSuggestions([]);
    loadStudents();

    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  } catch (err: any) {
    if (err.response?.status === 409) {
      setErrorMsg("⚠️ Học sinh đã có trong danh sách lớp này");
    } else {
      setErrorMsg("❌ Lỗi khi thêm học sinh");
    }
  }
};

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa học sinh này khỏi danh sách?")) return;

    await api.delete(`/api/early-leave/students/${id}`);
    loadStudents();
  };

  /* ================= UI ================= */
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

        {filterClass ? (
          <Paper>
            <List>
              {students.map((s, i) => (
                <ListItem
                  key={s._id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleDelete(s._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${i + 1}. ${s.name}`}
                    secondary={`Lớp: ${s.className}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography color="text.secondary">
            Vui lòng chọn lớp để xem danh sách
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
