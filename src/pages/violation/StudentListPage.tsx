import React, { useEffect, useState } from "react";
import {
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import * as XLSX from "xlsx";
import api from "@/utils/api";

interface Student {
  _id?: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

interface ClassItem {
  _id: string;
  name: string;
}

const StudentListPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        setClasses(res.data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách lớp:", error);
      }
    };
    fetchClasses();
  }, []);

  // Load học sinh theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) {
      alert("Vui lòng chọn lớp!");
      return;
    }
    try {
      const res = await api.get("/api/students", {
        params: { classId: selectedClass },
      });
      setStudents(res.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách học sinh:", error);
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
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const importedStudents: Student[] = jsonData.map((row) => ({
        name: row["Họ tên"] || "",
        className: row["Lớp"] || "",
        fatherPhone: row["SDT Ba"] || "",
        motherPhone: row["SDT Mẹ"] || "",
      }));

      setStudents(importedStudents);
    };
    reader.readAsArrayBuffer(file);
  };

  // Lưu thay đổi
  const handleSaveChanges = async () => {
    try {
      await api.post("/api/students/bulk-update", { students });
      alert("Đã lưu thay đổi!");
    } catch (error) {
      console.error("Lỗi khi lưu thay đổi:", error);
    }
  };

  // Cập nhật dữ liệu bảng khi sửa trực tiếp
  const handleChange = (
    index: number,
    field: keyof Student,
    value: string
  ) => {
    const updatedStudents = [...students];
    updatedStudents[index][field] = value;
    setStudents(updatedStudents);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Trang ghi nhận kỷ luật</h2>

      {/* Dropdown chọn lớp */}
      <FormControl style={{ minWidth: 250, marginRight: 20 }}>
        <InputLabel id="class-select-label">Chọn lớp</InputLabel>
        <Select
          labelId="class-select-label"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classes.map((cls) => (
            <MenuItem key={cls._id} value={cls._id}>
              {cls.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Nút thao tác */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleLoadStudents}
        style={{ marginRight: 10 }}
      >
        LOAD DANH SÁCH
      </Button>

      <Button variant="contained" component="label" color="secondary">
        IMPORT EXCEL
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
        onClick={handleSaveChanges}
        style={{ marginLeft: 10 }}
      >
        LƯU THAY ĐỔI
      </Button>

      {/* Bảng học sinh */}
      <Table style={{ marginTop: 20 }}>
        <TableHead>
          <TableRow>
            <TableCell>Họ tên</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>SDT Ba</TableCell>
            <TableCell>SDT Mẹ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student, index) => (
            <TableRow key={student._id || index}>
              <TableCell>
                <TextField
                  value={student.name}
                  onChange={(e) =>
                    handleChange(index, "name", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={student.className}
                  onChange={(e) =>
                    handleChange(index, "className", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={student.fatherPhone || ""}
                  onChange={(e) =>
                    handleChange(index, "fatherPhone", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  value={student.motherPhone || ""}
                  onChange={(e) =>
                    handleChange(index, "motherPhone", e.target.value)
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
