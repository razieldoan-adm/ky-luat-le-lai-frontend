import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

interface StudentViolation {
  name: string;
  className: string;
  count: number;
}

const UnhandledViolationsPage = () => {
  const [students, setStudents] = useState<StudentViolation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnhandledStudents = async () => {
      try {
        const res = await api.get('/api/violations/unhandled/students');
        setStudents(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách học sinh chưa xử lý:', err);
      }
    };

    fetchUnhandledStudents();
  }, []);
  
  return (
    <Box
      sx={{
            px: { xs: 2, md: 5 },        // Padding trái phải linh hoạt theo màn hình
            pt: { xs: 2, md: 3 },        // Padding trên gần hơn
            maxWidth: '100%',
            minHeight: '100vh',
            boxSizing: 'border-box',
            mt: { xs: '10px', md: '0px' },
          }}
    >
      <Typography variant="h3" fontWeight="bold" align="center">
        Danh sách học sinh chưa xử lý
      </Typography>
       <Paper elevation={3}  sx={{ width: '100%', overflowX: 'auto', borderRadius: 3,mt: 2, }}>
      <Card elevation={3} >
        <CardContent>
          {students.length === 0 ? (
            <Typography color="text.secondary">
              Không có học sinh nào chưa xử lý.
            </Typography>
          ) : (
            
              <Table size="medium" sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#87cafe' }}>
                    <TableCell><strong>STT</strong></TableCell>
                    <TableCell><strong>Họ tên học sinh</strong></TableCell>
                    <TableCell><strong>Lớp</strong></TableCell>
                    <TableCell align="center"><strong>Số lỗi vi phạm</strong></TableCell>
                    <TableCell><strong>Tình trạng</strong></TableCell>
                    <TableCell><strong>Thao tác</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, idx) => (
                    <TableRow key={`${student.name}-${student.className}`}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.className}</TableCell>
                      <TableCell align="center">{student.count}</TableCell>
                      <TableCell>
                        <Chip label="Chưa xử lý" color="warning" size="small" />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() =>
                            navigate(
                              `violation/violations/${encodeURIComponent(
                                student.name
                              )}?className=${encodeURIComponent(
                                student.className
                              )}`
                            )
                          }
                        >
                          Xử lý
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>
      </Paper>
    </Box>
  );
};

export default UnhandledViolationsPage;
