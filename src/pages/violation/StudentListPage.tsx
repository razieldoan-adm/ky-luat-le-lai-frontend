import React, { useEffect, useState } from "react";
import {
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import api from "../../api/api";

interface ClassOption {
  _id: string;
  name: string;
  teacherName?: string;
}

interface Student {
  _id: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const StudentListPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách lớp từ backend
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

  // Load danh sách học sinh theo lớp
  const handleLoadStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await api.get("/api/students", {
        params: { className: selectedClass },
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi khi load danh sách:", err);
      alert("Không thể load danh sách học sinh");
    } finally {
      setLoading(false);
    }
  };

  // Import file Excel
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`Import thành công: ${res.data.count} học sinh`);
    } catch (err) {
      console.error("Lỗi import:", err);
      alert("Import thất bại");
    }
  };

  // Lưu số điện thoại cha mẹ
  const handleSavePhones = async () => {
    try {
      await api.post("/api/students/update-phones", students);
      alert("Cập nhật số điện thoại thành công");
    } catch (err) {
      console.error("Lỗi khi lưu thay đổi:", err);
      alert("Lưu thất bại");
    }
  };

  // Chỉnh sửa số điện thoại trong bảng
  const handlePhoneChange = (
    id: string,
    field: "fatherPhone" | "motherPhone",
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h5" gutterBottom>
        Danh sách học sinh
      </Typography>

      {/* Chọn lớp */}
      <div style={{ marginBottom: 20, display: "flex", gap: "10px" }}>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          displayEmpty
          style={{ minWidth: 200 }}
        >
          <MenuItem value="">
            <em>-- Chọn lớp --</em>
          </MenuItem>
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.name}>
              {cls.name} {cls.teacherName ? `- GVCN: ${cls.teacherName}` : ""}
            </MenuItem>
          ))}
        </Select>

        <Button
          variant="contained"
          color="primary"
          onClick={handleLoadStudents}
          disabled={!selectedClass || loading}
        >
          {loading ? "Đang tải..." : "Load danh sách"}
        </Button>

        <Button variant="contained" component="label" color="secondary">
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleImport}
          />
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={handleSavePhones}
          disabled={students.length === 0}
        >
          Lưu số điện thoại
        </Button>
      </div>

      {/* Bảng học sinh */}
      {students.length > 0 && (
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
            {students.map((s, index) => (
              <TableRow key={s._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.className}</TableCell>
                <TableCell>
                  <TextField
                    value={s.fatherPhone || ""}
                    onChange={(e) =>
                      handlePhoneChange(s._id, "fatherPhone", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={s.motherPhone || ""}
                    onChange={(e) =>
                      handlePhoneChange(s._id, "motherPhone", e.target.value)
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default StudentListPage;
