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

const AddClassPage = () => {
  const [classList, setClassList] = useState<ClassType[]>([]);

  useEffect(() => {
    fetchExistingClasses();
  }, []);

  const fetchExistingClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClassList(res.data); // dữ liệu từ DB có dạng [{ className, teacher }]
    } catch (err) {
      console.error('Lỗi khi tải danh sách lớp:', err);
    }
  };

  const handleTeacherChange = (index: number, value: string) => {
    const newList = [...classList];
    newList[index].teacher = value;
    setClassList(newList);
  };

  const handleAddClass = (grade: number) => {
    const sameGrade = classList.filter(cls =>
      cls.className.startsWith(`${grade}A`)
    );
    const nextIndex =
      sameGrade.length > 0
        ? Math.max(
            ...sameGrade.map(c =>
              parseInt(c.className.replace(`${grade}A`, ''))
            )
          ) + 1
        : 1;

    const newClass = { className: `${grade}A${nextIndex}`, teacher: '' };
    setClassList(prev => [...prev, newClass]);
  };

  const handleDeleteClass = (className: string) => {
    setClassList(prev => prev.filter(c => c.className !== className));
  };

  const handleSaveAll = async () => {
    try {
      for (const classItem of classList) { await api.post('/api/classes', { className: classItem.className, teacher: classItem.teacher.trim(), // Cho phép rỗng });
      alert('Đã lưu danh sách lớp thành công');
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      alert('Lưu thất bại');
    }
  };

  const renderTable = (grade: number) => {
    const classes = classList.filter(cls =>
      cls.className.startsWith(`${grade}A`)
    );

    return (
      <Box sx={{ flex: 1, minWidth: 350 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Khối {grade}
        </Typography>
        <Table component={Paper} size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell><strong>STT</strong></TableCell>
              <TableCell><strong>Lớp</strong></TableCell>
              <TableCell><strong>GVCN</strong></TableCell>
              <TableCell><strong>Xoá</strong></TableCell>
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
                <TableCell>
                  <Button
                    color="error"
                    onClick={() => handleDeleteClass(cls.className)}
                  >
                    _
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {/* Dòng thêm lớp */}
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleAddClass(grade)}
                >
                  + Thêm lớp
                </Button>
              </TableCell>
            </TableRow>
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

      <Box sx={{ marginTop: 3 }}>
        <Button variant="contained" color="primary" onClick={handleSaveAll}>
          Lưu tất cả
        </Button>
      </Box>
    </Box>
  );
};

export default AddClassPage;
