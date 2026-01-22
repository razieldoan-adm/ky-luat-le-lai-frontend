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
} from "@mui/material";
import api from "../../api/api";

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export default function EarlyLeaveInputPage() {
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  /* INIT VOICE */
  useEffect(() => {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SR) return;

  const recognition = new SR();
  recognition.lang = "vi-VN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognitionRef.current = recognition;

  recognition.onresult = (event: any) => {
    let transcript = "";

    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    setName(transcript.trim());
  };

  recognition.onend = () => setIsListening(false);
  recognition.onerror = () => setIsListening(false);
}, []);


  const startVoice = () => {
  const recognition = recognitionRef.current;
  if (!recognition) return;

  setIsListening(true);
  recognition.start();

  setTimeout(() => {
    recognition.stop();
  }, 2000); // 1.2 giây là tối ưu mobile
};


  /* SEARCH */
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
    }, 200);

    return () => clearTimeout(t);
  }, [name]);

  /* ADD */
  const handleAddStudent = async (s: StudentSuggestion) => {
    try {
      await api.post("/api/early-leave/students", {
        name: s.name,
        className: s.className,
      });

      setErrorMsg("✅ Đã thêm thành công");
      setName("");
      setSuggestions([]);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMsg("❌ Học sinh đã tồn tại trong danh sách");
      } else {
        setErrorMsg("❌ Lỗi hệ thống");
      }
    }
  };

  return (
    <Box sx={{ width: "50vw", mx: "auto", mt: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Nhập học sinh xin ra về
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Nói hoặc nhập tên học sinh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />

        <Button
          variant={isListening ? "contained" : "outlined"}
          color={isListening ? "error" : "secondary"}
          onClick={startVoice}
        >
          {isListening ? "🎙️ Đang nghe..." : "🎤 Nói tên"}
        </Button>

        {errorMsg && (
          <Typography color="error" fontWeight="bold">
            {errorMsg}
          </Typography>
        )}

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
      </Stack>
    </Box>
  );
}
