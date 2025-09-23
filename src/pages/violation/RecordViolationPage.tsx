// src/pages/RecordViolationPage.tsx
import React, { useState } from "react";
import {
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

interface Student {
  id: string;
  name: string;
  className: string;
}

const RecordViolationPage: React.FC = () => {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const navigate = useNavigate();

  // thêm HS vào danh sách
  const handleAdd = () => {
    if (!name.trim() || !className.trim()) return;

    const newStudent: Student = {
      id: Date.now().toString(),
      name: name.trim(),
      className: className.trim(),
    };

    setStudents((prev) => [...prev, newStudent]);
    setName("");
    setClassName("");
  };

  // điều hướng sang trang ghi nhận vi phạm
  const handleGoViolation = (student: Student) => {
    navigate(`/violations/${student.id}`, { state: student });
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Form nhập học sinh */}
      <Card sx={{ maxWidth: 500, margin: "0 auto", mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Nhập học sinh
          </Typography>
          <TextField
            label="Tên học sinh"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Lớp"
            fullWidth
            margin="normal"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAdd}
            fullWidth
          >
            Thêm học sinh
          </Button>
        </CardContent>
      </Card>

      {/* Danh sách học sinh */}
      <div>
        <Typography variant="h6" gutterBottom>
          Danh sách học sinh
        </Typography>
        {students.map((s) => (
          <Card
            key={s.id}
            sx={{
              mb: 2,
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => handleGoViolation(s)} // click cả card cũng sang trang
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
                e.stopPropagation(); // tránh trùng sự kiện click card
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
