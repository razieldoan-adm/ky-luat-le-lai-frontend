// pages/StudentListPage.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TextField } from '@mui/material';

export default function StudentListPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [className, setClassName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchStudents = async () => {
    if (!className) return;
    const res = await axios.get('/api/students', { params: { className } });
    setStudents(res.data);
  };

  const handleImport = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    await axios.post('/api/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setStudents([]); // reset sau khi import
  };

  const handleSavePhones = async () => {
    await axios.post('/api/students/update-phones', students);
    alert('Đã lưu số điện thoại');
  };

  const handleChangePhone = (id: string, field: string, value: string) => {
    setStudents(prev =>
      prev.map(s => (s._id === id ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="p-4">
      <h1>Danh sách học sinh</h1>

      <div className="flex gap-4 my-4">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button variant="contained" onClick={handleImport}>Import Excel</Button>

        <Select value={className} onChange={(e) => setClassName(e.target.value)} displayEmpty>
          <MenuItem value="">Chọn lớp</MenuItem>
          <MenuItem value="10A1">10A1</MenuItem>
          <MenuItem value="10A2">10A2</MenuItem>
          <MenuItem value="11A1">11A1</MenuItem>
        </Select>
        <Button variant="contained" onClick={fetchStudents}>Load danh sách</Button>
        <Button variant="outlined" onClick={handleSavePhones}>Lưu</Button>
      </div>

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
            {students.map((s, i) => (
              <TableRow key={s._id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.className}</TableCell>
                <TableCell>
                  <TextField
                    value={s.fatherPhone || ''}
                    onChange={(e) => handleChangePhone(s._id, 'fatherPhone', e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={s.motherPhone || ''}
                    onChange={(e) => handleChangePhone(s._id, 'motherPhone', e.target.value)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
