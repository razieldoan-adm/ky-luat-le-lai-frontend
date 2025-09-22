import { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import * as XLSX from "xlsx";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name: string;
  teacher: string;
}

interface Student {
  _id?: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const StudentListPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  // ✅ Lấy danh sách lớp
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

  // ✅ Load học sinh theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/api/students?className=${selectedClass}`);
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi load học sinh:", err);
    }
  };

  // ✅ Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Gửi dữ liệu import về backend
      api
        .post("/api/students/import", { data: jsonData })
        .then(() => {
          alert("Import thành công");
          if (selectedClass) handleLoadStudents(); // reload sau import
        })
        .catch((err) => console.error("Lỗi import:", err));
    };
    reader.readAsBinaryString(file);
  };

  // ✅ Cập nhật số điện thoại trong state
  const handleChangePhone = (
    index: number,
    field: "fatherPhone" | "motherPhone",
    value: string
  ) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

  // ✅ Lưu lại thay đổi số điện thoại
  const handleSave = async () => {
    try {
      await api.post("/api/students/update-phones", { students });
      alert("Lưu thành công");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Danh sách học sinh
      </Typography>

      {/* Dropdown chọn lớp */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">
            <em>Chọn lớp</em>
          </MenuItem>
          {classOptions.map((c) => (
            <MenuItem key={c._id} value={c.name}>
              {c.name} - GVCN: {c.teacher}
            </MenuItem>
          ))}
        </Select>

        <Button variant="contained" onClick={handleLoadStudents}>
          Load danh sách
        </Button>

        <Button variant="contained" component="label">
          Import Excel
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
          />
        </Button>

        <Button variant="outlined" color="success" onClick={handleSave}>
          Lưu thay đổi
        </Button>
      </Box>

      {/* Bảng danh sách học sinh */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Họ tên</TableCell>
            <TableCell>Lớp</TableCell>
            <TableCell>SĐT Ba</TableCell>
            <TableCell>SĐT Mẹ</TableCell>
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
                  size="small"
                  value={s.fatherPhone || ""}
                  onChange={(e) =>
                    handleChangePhone(idx, "fatherPhone", e.target.value)
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  value={s.motherPhone || ""}
                  onChange={(e) =>
                    handleChangePhone(idx, "motherPhone", e.target.value)
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default StudentListPage;
