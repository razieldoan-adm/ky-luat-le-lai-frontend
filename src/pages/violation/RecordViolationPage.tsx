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

export default function RecordViolationPage() {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const navigate = useNavigate();

  // 🔎 Gợi ý học sinh theo tên (dùng bảng Student)
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(() => {
      api
        .get(`/api/students/search?name=${encodeURIComponent(name)}`)
        .then((res) => setSuggestions(res.data))
        .catch((err) => {
          console.error('Search error:', err);
          setSuggestions([]);
        });
    }, 300);

    return () => clearTimeout(timeout);
  }, [name]);

  // 📌 Lấy danh sách lớp có GVCN
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
      `/violation/violations/${encodeURIComponent(name)}?className=${encodeURIComponent(className)}`
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
          <>
            <Typography variant="subtitle1" sx={{ mt: 4 }}>
              Gợi ý học sinh:
            </Typography>
            <Paper elevation={2} sx={{ mt: 1 }}>
              <List>
                {suggestions.map((s) => (
                  <ListItemButton
                    key={s._id}
                    onClick={() =>
                      navigate(
                        `/violation/violations/${encodeURIComponent(s.name)}?className=${encodeURIComponent(
                          s.className
                        )}`
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
          </>
        )}
      </Box>
    </Box>
  );
}
