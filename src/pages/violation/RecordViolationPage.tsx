import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Typography,
  Button,
  Stack,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import api from "../../api/api";

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
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const navigate = useNavigate();

  // 🔍 Gọi API gợi ý theo tên học sinh
  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await api.get(
          `/api/students/search?name=${encodeURIComponent(name)}`
        );
        setSuggestions(res.data);
      } catch (err) {
        console.error("Search error:", err);
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [name]);

  // 📌 Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes/with-teacher");
        setClassOptions(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  const handleManualSubmit = () => {
    if (!name.trim() || !className.trim()) return;
    navigate(
      `/violation/violations/${encodeURIComponent(
        name
      )}?className=${encodeURIComponent(className)}`
    );
  };

  return (
    <Box
      sx={{
        width: "75vw",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        py: 6,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1000 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Ghi nhận lỗi học sinh vi phạm kỷ luật
        </Typography>

        {/* Form nhập thủ công */}
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

        {/* Danh sách gợi ý */}
        {suggestions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Học sinh gợi ý:
            </Typography>
            <Paper elevation={3}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><b>Tên học sinh</b></TableCell>
                    <TableCell><b>Lớp</b></TableCell>
                    <TableCell><b>Thao tác</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suggestions.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.className}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            navigate(
                              `/violation/violations/${encodeURIComponent(
                                s.name
                              )}?className=${encodeURIComponent(s.className)}`
                            )
                          }
                        >
                          Ghi nhận
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
