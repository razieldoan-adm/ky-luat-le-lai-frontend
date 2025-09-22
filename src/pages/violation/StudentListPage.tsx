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
import * as XLSX from "xlsx"; // cần cài: npm install xlsx
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
        setClassOptions(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // Load học sinh theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get("/api/students", {
        params: { classId: selectedClass },
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách học sinh:", err);
    }
  };

  // Nhập SĐT cha mẹ
  const handleInputChange = (index: number, field: string, value: string) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], [field]: value };
    setStudents(newStudents);
  };

  // Lưu tất cả
  const handleSaveAll = async () => {
    try {
      await api.put("/api/students/update-phones", { students });
      alert("Đã lưu thay đổi thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu thay đổi:", err);
      alert("Có lỗi xảy ra khi lưu!");
    }
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(sheet);

      // Map dữ liệu Excel thành students
      const importedStudents = (excelData as any[]).map((row) => ({
       
        name: row["Họ tên"] || "",
        className: row["Lớp"] || "",
        fatherPhone: row["SĐT Ba"] || "",
        motherPhone: row["SĐT Mẹ"] || "",
      }));

      setStudents(importedStudents);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2>Danh sách học sinh</h2>

      <FormControl sx={{ minWidth: 250, mr: 2 }}>
        <InputLabel id="class-select-label">Chọn lớp</InputLabel>
        <Select
          labelId="class-select-label"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classOptions.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.className} - GVCN: {c.teacher || "?"}
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

      <Button
        variant="contained"
        color="secondary"
        sx={{ ml: 2 }}
        component="label"
      >
        Import Excel
        <input
          type="file"
          hidden
          accept=".xlsx, .xls"
          onChange={handleImportExcel}
        />
      </Button>

      <Button
        variant="outlined"
        color="success"
        sx={{ ml: 2 }}
        onClick={handleSaveAll}
        disabled={students.length === 0}
      >
        Lưu thay đổi
      </Button>

      {/* Bảng học sinh */}
      <Table sx={{ mt: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Tên học sinh</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>SĐT Ba</TableCell>
            <TableCell>SĐT Mẹ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((s, index) => (
            <TableRow key={s._id || index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.className}</TableCell>
              <TableCell>
                <TextField
                  variant="standard"
                  value={s.fatherPhone || ""}
                  onChange={(e) =>
                    handleInputChange(index, "fatherPhone", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  variant="standard"
                  value={s.motherPhone || ""}
                  onChange={(e) =>
                    handleInputChange(index, "motherPhone", e.target.value)
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
