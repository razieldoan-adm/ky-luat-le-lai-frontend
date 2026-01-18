import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  MenuItem,
  Divider,
} from "@mui/material";
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
  const [className, setClassName] = useState("");

  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [students, setStudents] = useState<EarlyLeaveStudent[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [isListening, setIsListening] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  /* ================= INIT VOICE ================= */
  useEffect(() => {
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SR) {
      alert("Trình duyệt không hỗ trợ nhận dạng giọng nói");
      return;
    }

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
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }

      if (interimText) setName(interimText);

      if (finalText) {
        setName(finalText);
        setSuggestions([]);

        try {
          const params = new URLSearchParams();
          params.append("name", finalText.trim());
          params.append(
            "normalizedName",
            removeVietnameseTones(finalText.trim())
          );
          if (className) params.append("className", className);

          const res = await api.get(
            `/api/students/search?${params.toString()}`
          );
          setSuggestions(res.data);
        } catch {
          setSuggestions([]);
        }
      }

      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => recognition.stop(), 200);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  /* ================= SEARCH BY TEXT ================= */
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      params.append("name", name.trim());
      params.append("normalizedName", removeVietnameseTones(name.trim()));
      if (className) params.append("className", className);

      api
        .get(`/api/students/search?${params.toString()}`)
        .then((res) => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, className]);

  /* ================= LOAD CLASS ================= */
  useEffect(() => {
    api
      .get("/api/classes/with-teacher")
      .then((res) => setClassOptions(res.data))
      .catch(console.error);
  }, []);

  /* ================= LOAD LIST BY CLASS ================= */
  useEffect(() => {
    if (!className) {
      setStudents([]);
      return;
    }

    api
      .get(`/api/early-leave/by-class?className=${className}`)
      .then((res) => setStudents(res.data))
      .catch(console.error);
  }, [className]);

  /* ================= SAVE ================= */
  const handleSave = async (studentName: string) => {
    if (!className) return;

    await api.post("/api/early-leave", {
      name: studentName,
      className,
    });

    setName("");
    setSuggestions([]);

    const res = await api.get(
      `/api/early-leave/by-class?className=${className}`
    );
    setStudents(res.data);

    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  /* ================= UI ================= */
  return (
    <Box sx={{ width: "75vw", py: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Danh sách học sinh xin ra về sớm
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Tên học sinh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />

        <Button
          variant={isListening ? "contained" : "outlined"}
          color={isListening ? "error" : "secondary"}
          onClick={startVoice}
        >
          {isListening ? "🎙️ Đang nghe..." : "🎤 Nói tên học sinh"}
        </Button>

        <TextField
          label="Chọn lớp"
          select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          fullWidth
        >
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className} — {cls.teacher}
            </MenuItem>
          ))}
        </TextField>

        {suggestions.length > 0 && (
          <Paper>
            <List>
              {suggestions.map((s) => (
                <ListItemButton
                  key={s._id}
                  onClick={() => handleSave(s.name)}
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

        <Typography variant="h6" ref={listRef}>
          Danh sách học sinh theo lớp
        </Typography>

        {students.length > 0 && (
          <Paper>
            <List>
              {students.map((s, i) => (
                <ListItemText
                  key={s._id}
                  primary={`${i + 1}. ${s.name}`}
                  secondary={`Lớp: ${s.className}`}
                  sx={{ px: 2, py: 1 }}
                />
              ))}
            </List>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
