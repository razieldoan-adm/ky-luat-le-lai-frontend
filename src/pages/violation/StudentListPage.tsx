import React, { useEffect, useState } from "react";
import {
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import api from "../../api/api"; // ✅ nhớ import đúng API

const StudentListPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);

  // Lấy danh sách lớp
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

  // Import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/api/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Import thành công!");
    } catch (err) {
      console.error("Lỗi khi import Excel:", err);
      alert("Import thất bại!");
    }
  };

  // Load danh sách theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) {
      alert("Vui lòng chọn lớp!");
      return;
    }
    try {
      const res = await api.get(`/api/students`, {
        params: { className: selectedClass },
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi load danh sách học sinh:", err);
    }
  };

  // Cập nhật dữ liệu bảng (SDT Ba/Mẹ)
  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...students];
    updated[index][field] = value;
    setStudents(updated);
  };

  // Lưu thay đổi
  const handleSave = async () => {
    try {
      await api.put("/api/students/update-many", { students });
      alert("Lưu thay đổi thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu thay đổi:", err);
    }
  };

  return (
    <div>
      <h2>Trang ghi nhận kỷ luật</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          displayEmpty
          style={{ minWidth: "200px" }}
        >
          <MenuItem value="">
            <em>Chọn lớp</em>
          </MenuItem>
          {classOptions.map((c) => (
            <MenuItem key={c._id} value={c.name}>
              {c.name} - GVCN: {c.teacherName}
            </MenuItem>
          ))}
        </Select>

        <Button variant="contained" onClick={handleLoadStudents}>
          LOAD DANH SÁCH
        </Button>

        <Button variant="contained" component="label" color="secondary">
          IMPORT EXCEL
          <input type="file" hidden onChange={handleImportExcel} />
        </Button>

        <Button variant="outlined" color="success" onClick={handleSave}>
          LƯU THAY ĐỔI
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Họ tên</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>SDT Ba</TableCell>
            <TableCell>SDT Mẹ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s, idx) => (
            <TableRow key={s._id || idx}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.className}</TableCell>
              <TableCell>
                <TextField
                  value={s.fatherPhone || ""}
                  onChange={(e) =>
                    handleChange(idx, "fatherPhone", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={s.motherPhone || ""}
                  onChange={(e) =>
                    handleChange(idx, "motherPhone", e.target.value)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentListPage;
