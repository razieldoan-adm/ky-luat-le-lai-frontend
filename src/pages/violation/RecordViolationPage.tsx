import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
  fatherPhone?: string;
  motherPhone?: string;
}

const RecordViolationPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/students/search?name=${encodeURIComponent(value)}`);
      setStudents(res.data);
    } catch (err) {
      console.error("Lỗi tìm kiếm:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Ghi nhận vi phạm
      </Typography>

      {/* Ô tìm kiếm */}
      <TextField
        label="Tìm học sinh theo tên"
        variant="outlined"
        fullWidth
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* Loading */}
      {loading && <CircularProgress size={28} />}

      {/* Bảng kết quả */}
      {students.length > 0 && (
        <Paper sx={{ mt: 2 }}>
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
                  <TableCell>{s.fatherPhone || "-"}</TableCell>
                  <TableCell>{s.motherPhone || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default RecordViolationPage;
