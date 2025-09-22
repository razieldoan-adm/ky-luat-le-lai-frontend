import React, { useEffect, useState } from "react";
import {
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
} from "@mui/material";
import api from "@/api"; // axios instance của bạn

interface Student {
  _id: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const StudentListPage: React.FC = () => {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // load danh sách lớp từ setting
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/settings/classes");
        setClasses(res.data || []);
      } catch (err) {
        console.error("Lỗi load danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // load học sinh theo lớp
  const handleLoad = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await api.get("/api/students", {
        params: { className: selectedClass },
      });
      setStudents(res.data || []);
    } catch (err) {
      console.error("Lỗi load danh sách học sinh:", err);
    } finally {
      setLoading(false);
    }
  };

  // update khi nhập số điện thoại
  const handleChangePhone = (
    id: string,
    field: "fatherPhone" | "motherPhone",
    value: string
  ) => {
    setStudents((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [field]: value } : s))
    );
  };

  // lưu thay đổi
  const handleSave = async () => {
    try {
      await api.put("/api/students/bulk-update", { students });
      alert("Lưu thành công!");
    } catch (err) {
      console.error("Lỗi lưu:", err);
      alert("Lưu thất bại!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Danh sách học sinh</h2>

      <FormControl sx={{ minWidth: 200, mr: 2 }}>
        <InputLabel>Lớp</InputLabel>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleLoad} sx={{ mr: 1 }}>
        Load danh sách
      </Button>
      <Button
        variant="outlined"
        onClick={handleSave}
        disabled={students.length === 0}
      >
        Lưu
      </Button>

      {loading && <p>Đang tải...</p>}

      {students.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
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
                        handleChangePhone(s._id, "fatherPhone", e.target.value)
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={s.motherPhone || ""}
                      onChange={(e) =>
                        handleChangePhone(s._id, "motherPhone", e.target.value)
                      }
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default StudentListPage;
