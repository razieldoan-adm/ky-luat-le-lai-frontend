import React, { useState, useEffect } from "react";
import {
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
} from "@mui/material";
import api from "../../api/api";

const StudentListPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<any[]>([]);

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes/with-teacher");
        console.log("Classes API:", res.data); // 👈 xem dữ liệu trả về
        setClassOptions(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // Hàm load học sinh theo lớp đã chọn
  const handleLoadStudents = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get("/api/students", {
        params: { classId: selectedClass }, // 👈 truyền classId hoặc className theo backend
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách học sinh:", err);
    }
  };

  return (
    <div>
      <h2>Danh sách học sinh</h2>

      <FormControl sx={{ minWidth: 200, mr: 2 }}>
        <InputLabel id="class-select-label">Chọn lớp</InputLabel>
        <Select
          labelId="class-select-label"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classOptions.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.className || c.name} - GVCN: {c.teacherName || c.gvcn}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        color="primary"
        onClick={handleLoadStudents}
        disabled={!selectedClass}
      >
        Load danh sách
      </Button>

      {/* Bảng học sinh */}
      <Table sx={{ mt: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Tên học sinh</TableCell>
            <TableCell>Lớp</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s, index) => (
            <TableRow key={s._id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <TextField
                  variant="standard"
                  defaultValue={s.name}
                  fullWidth
                />
              </TableCell>
              <TableCell>{s.className || s.class}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentListPage;
