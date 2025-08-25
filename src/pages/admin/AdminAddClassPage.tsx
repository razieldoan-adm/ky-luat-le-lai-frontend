import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import api from '../../api/api';

interface ClassType {
  className: string;
  teacher: string;
}

const generateClassList = () => {
  const result: ClassType[] = [];
  for (let grade = 6; grade <= 9; grade++) {
    for (let i = 1; i <= 10; i++) {
      result.push({ className: `${grade}A${i}`, teacher: '' });
    }
  }
  return result;
};

const AddClassPage = () => {
  const [classList, setClassList] = useState<ClassType[]>(generateClassList());

  useEffect(() => {
    fetchExistingClasses();
  }, []);

  const fetchExistingClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const existing = res.data;

      setClassList((prev) =>
        prev.map((cls) => {
          const found = existing.find((e: ClassType) => e.className === cls.className);
          return found ? { ...cls, teacher: found.teacher } : cls;
        })
      );
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp:', err);
    }
  };

  const handleTeacherChange = (index: number, value: string) => {
    const newList = [...classList];
    newList[index].teacher = value;
    setClassList(newList);
  };

  // Lưu toàn bộ danh sách
  const handleSaveAll = async () => {
    try {
      for (const classItem of classList) {
        await api.post('/api/classes', {
          className: classItem.className,
          teacher: classItem.teacher.trim(), // Cho phép rỗng
        });
      }
      alert('Đã lưu toàn bộ danh sách GVCN');
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      alert('Lưu thất bại');
    }
  };

  const renderTable = (grade: number) => {
    const classes = classList.filter((cls) => cls.className.startsWith(`${grade}`));

    return (
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Khối {grade}
        </Typography>
        <Table component={Paper} size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell><strong>STT</strong></TableCell>
              <TableCell><strong>Lớp</strong></TableCell>
              <TableCell><strong>GVCN</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((cls, idx) => (
              <TableRow key={cls.className}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{cls.className}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="outlined"
                    value={cls.teacher}
                    placeholder="(Có thể để trống)"
                    onChange={(e) =>
                      handleTeacherChange(
                        classList.findIndex(c => c.className === cls.className),
                        e.target.value
                      )
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

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Quản lý GVCN các lớp
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {renderTable(6)}
        {renderTable(7)}
        {renderTable(8)}
        {renderTable(9)}
      </Box>

      {/* Nút lưu tất cả */}
      <Box sx={{ marginTop: 3 }}>
        <Button variant="contained" color="primary" onClick={handleSaveAll}>
          Lưu tất cả
        </Button>
      </Box>
    </Box>
  );
};

export default AddClassPage;
