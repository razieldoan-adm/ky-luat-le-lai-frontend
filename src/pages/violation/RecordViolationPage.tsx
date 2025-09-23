// src/pages/RecordViolationPage.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Student {
  _id: string;
  name: string;
  className: string;
}

const RecordViolationPage: React.FC = () => {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [suggestedStudents, setSuggestedStudents] = useState<Student[]>([]);
  const navigate = useNavigate();

  // Lấy danh sách lớp từ DB
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await axios.get("/api/classes");
        setClasses(res.data.map((c: any) => c.name));
      } catch (error) {
        console.error("Lỗi lấy danh sách lớp:", error);
      }
    };
    fetchClasses();
  }, []);

  // Gọi API tìm HS gợi ý
  useEffect(() => {
    const fetchStudents = async () => {
      if (!name.trim() || !className) {
        setSuggestedStudents([]);
        return;
      }
      try {
        const res = await axios.get("/api/students/search", {
          params: { name, className },
        });
        setSuggestedStudents(res.data);
      } catch (error) {
        console.error("Lỗi tìm học sinh:", error);
      }
    };

    const delayDebounce = setTimeout(fetchStudents, 400); // debounce 0.4s
    return () => clearTimeout(delayDebounce);
  }, [name, className]);

  // Chuyển sang trang ghi nhận vi phạm
  const handleGoViolation = (student: Student) => {
    navigate(`/violations/${student._id}`, { state: student });
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Form nhập */}
      <Card sx={{ maxWidth: 600, margin: "0 auto", mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Ghi nhận vi phạm
          </Typography>
          <TextField
            label="Tên học sinh"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            select
            label="Chọn lớp"
            fullWidth
            margin="normal"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            {classes.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      {/* Danh sách gợi ý */}
      <div>
        <Typography variant="h6" gutterBottom>
          Kết quả tìm kiếm
        </Typography>
        {suggestedStudents.map((s) => (
          <Card
            key={s._id}
            sx={{
              mb: 2,
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => handleGoViolation(s)}
          >
            <div>
              <Typography>
                <b>{s.name}</b>
              </Typography>
              <Typography variant="body2">Lớp: {s.className}</Typography>
            </div>
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleGoViolation(s);
              }}
            >
              Ghi nhận vi phạm
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecordViolationPage;
