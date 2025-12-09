import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  MenuItem,
} from '@mui/material';
import api from '../../api/api';

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}
interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// 🔥 tạo ngoài component để không tạo lại mỗi lần
let recognition: any = null;
let stopTimer: any = null;

export default function RecordViolationPage() {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);

  // 🧠 Khởi tạo Web Speech API 1 lần duy nhất
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
    recognition.interimResults = true; // 🔥 chữ realtime
  }, []);

  // 🎤 Bấm nút ghi âm
  const startVoice = () => {
    if (!recognition) return;

    setIsListening(true);
    recognition.start();

    // có chữ là cập nhật liên tục
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");

      setName(text);

      // ⛔ dừng khi im lặng 200ms → nhanh hơn nhiều
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => recognition.stop(), 200);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // 🔎 Gợi ý học sinh từ DB
  useEffect(() => {
    if (!name.trim() && !className.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (name.trim()) {
        params.append('name', name.trim());
        params.append('normalizedName', removeVietnameseTones(name.trim()));
      }
      if (className.trim()) params.append('className', className.trim());

      api
        .get(`/api/students/search?${params.toString()}`)
        .then((res) => setSuggestions(res.data))
        .catch((err) => {
          console.error('Search error:', err);
          setSuggestions([]);
        });
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, className]);

  // 📌 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/api/classes/with-teacher');
        setClassOptions(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  const handleManualSubmit = () => {
    if (!name.trim() || !className.trim()) return;
    navigate(
      `/violation/violations/${encodeURIComponent(name)}?className=${encodeURIComponent(
        className
      )}`
    );
  };

  return (
    <Box
      sx={{
        width: '75vw',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: 6,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Ghi nhận lỗi học sinh vi phạm kỷ luật
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Nhập tên học sinh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          <Button
            variant={isListening ? "contained" : "outlined"}
            color={isListening ? "error" : "secondary"}
            onClick={startVoice}
          >
            {isListening ? "🎙️ Đang nghe..." : "🎤 Nói"}
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

          <Button
            variant="contained"
            color="primary"
            onClick={handleManualSubmit}
            disabled={!name.trim() || !className.trim()}
          >
            Ghi nhận lỗi
          </Button>
        </Stack>

        {suggestions.length > 0 && (
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Gợi ý học sinh:
            </Typography>
            <List>
              {suggestions.map((s) => (
                <ListItemButton
                  key={s._id}
                  onClick={() =>
                    navigate(
                      `/violation/violations/${encodeURIComponent(
                        s.name
                      )}?className=${encodeURIComponent(s.className)}`
                    )
                  }
                >
                  <ListItemText
                    primary={`Tên: ${s.name}`}
                    secondary={`Lớp: ${s.className}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
