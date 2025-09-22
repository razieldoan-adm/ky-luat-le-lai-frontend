import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";

const StudentPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // 📌 Load danh sách theo lớp
  const fetchStudents = async () => {
    try {
      const res = await axios.get("/api/students", {
        params: { className: selectedClass },
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi load HS:", err);
    }
  };

  useEffect(() => {
    if (selectedClass) fetchStudents();
  }, [selectedClass]);

  // 📌 Import Excel
  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post("/api/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Import thành công!");
      fetchStudents();
    } catch (err) {
      alert("Lỗi import!");
    }
  };

  // 📌 Lưu số điện thoại
  const handleSavePhones = async () => {
    try {
      await axios.post("/api/students/update-phones", students);
      alert("Cập nhật số điện thoại thành công!");
      fetchStudents();
    } catch (err) {
      alert("Lỗi cập nhật!");
    }
  };

  // 📌 Thay đổi số điện thoại trong state
  const handlePhoneChange = (id: string, field: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Quản lý học sinh</h2>

      {/* Chọn lớp */}
      <div style={{ marginBottom: 20 }}>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">-- Chọn lớp --</MenuItem>
          <MenuItem value="10A1">10A1</MenuItem>
          <MenuItem value="10A2">10A2</MenuItem>
          <MenuItem value="11A1">11A1</MenuItem>
          {/* TODO: load động từ API nếu có */}
        </Select>
        <Button onClick={fetchStudents} variant="outlined" style={{ marginLeft: 10 }}>
          Tải danh sách
        </Button>
      </div>

      {/* Import Excel */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />
        <Button onClick={handleImport} variant="contained" style={{ marginLeft: 10 }}>
          Import Excel
        </Button>
      </div>

      {/* Bảng học sinh */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Tên</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>Điện thoại Cha</TableCell>
            <TableCell>Điện thoại Mẹ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s, i) => (
            <TableRow key={s._id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.className}</TableCell>
              <TableCell>
                <TextField
                  value={s.fatherPhone || ""}
                  onChange={(e) =>
                    handlePhoneChange(s._id, "fatherPhone", e.target.value)
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={s.motherPhone || ""}
                  onChange={(e) =>
                    handlePhoneChange(s._id, "motherPhone", e.target.value)
                  }
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Lưu số điện thoại */}
      <div style={{ marginTop: 20 }}>
        <Button onClick={handleSavePhones} variant="contained" color="primary">
          Lưu số điện thoại
        </Button>
      </div>
    </div>
  );
};

export default StudentPage;
