import { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Paper, Typography, Button, Checkbox } from '@mui/material';

type AcademicWeek = {
  _id: string;
  startDate: string;
  endDate: string;
  isStudyWeek: boolean;
};

const AdminWeeksSettingsPage = () => {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    const res = await axios.get('/api/academic-weeks');
    setWeeks(res.data);
  };

  const handleCheckboxChange = (id: string) => {
    setWeeks(prev =>
      prev.map(w =>
        w._id === id ? { ...w, isStudyWeek: !w.isStudyWeek } : w
      )
    );
  };

  const generateWeeks = async () => {
    await axios.post('/api/academic-weeks/generate');
    fetchWeeks();
  };

  const deleteAllWeeks = async () => {
    if (confirm('Bạn có chắc muốn xoá toàn bộ tuần học không?')) {
      await axios.delete('/api/academic-weeks');
      fetchWeeks();
    }
  };

  const saveChanges = async () => {
    try {
      const res = await axios.put('/api/academic-weeks/bulk', weeks);
      alert(res.data.message);
      setEditMode(false);
      fetchWeeks();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi lưu');
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  // Chia weeks thành 4 column mỗi column 10 tuần
  const columnSize = 10;
  const columns: AcademicWeek[][] = [];
  for (let i = 0; i < weeks.length; i += columnSize) {
    columns.push(weeks.slice(i, i + columnSize));
  }

  // Danh sách tuần học đã chọn, sắp xếp theo thời gian để đánh số tuần
  const selectedWeeks = weeks
    .filter(w => w.isStudyWeek)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const selectedOrderMap = new Map<string, number>();
  selectedWeeks.forEach((w, index) => {
    selectedOrderMap.set(w._id, index + 1);
  });

  // Hàm xác định tuần hiện tại (dựa trên ngày thực tế)
  const getCurrentWeekNumber = () => {
    const today = new Date();
    for (let i = 0; i < selectedWeeks.length; i++) {
      const week = selectedWeeks[i];
      const start = new Date(week.startDate);
      const end = new Date(week.endDate);

      if (today >= start && today <= end) {
        return i + 1; // Tuần học tính từ 1
      }
    }
    return null;
  };

  const currentWeekNumber = getCurrentWeekNumber();

  return (
    <Box p={2}>
      <Typography variant="h5" mb={2}>Quản lý tuần học</Typography>

      <Box mb={2} display="flex" gap={2} flexWrap="wrap">
        <Button variant="contained" color="secondary" onClick={generateWeeks}>
          Tạo tuần mới
        </Button>

        {!editMode ? (
          <Button variant="contained" color="primary" onClick={handleEdit}>
            Cập nhật
          </Button>
        ) : (
          <Button variant="contained" color="success" onClick={saveChanges}>
            Lưu
          </Button>
        )}

        <Button variant="contained" color="error" onClick={deleteAllWeeks}>
          Xoá toàn bộ
        </Button>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        {columns.map((column, colIndex) => (
          <Paper
            key={colIndex}
            elevation={3}
            sx={{ flex: '1 1 22%', p: 2, minWidth: '220px' }}
          >
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>
              Bảng {colIndex + 1}
            </Typography>

            {column.map((week) => {
              const weekNumber = selectedOrderMap.get(week._id);
              const isCurrent = currentWeekNumber === weekNumber;

              return (
                <Box
                  key={week._id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  borderBottom={1}
                  borderColor="divider"
                  py={0.5}
                >
                  <Box>
                    <Typography variant="body2">
                      {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Checkbox
                    checked={week.isStudyWeek}
                    disabled={!editMode}
                    onChange={() => handleCheckboxChange(week._id)}
                  />

                  <Typography
                    variant="body2"
                    sx={{
                      width: '70px',
                      textAlign: 'center',
                      color: isCurrent ? 'green' : 'inherit',
                      fontWeight: isCurrent ? 'bold' : 'normal'
                    }}
                  >
                    {week.isStudyWeek ? `Tuần ${weekNumber}${isCurrent ? ' ⭐' : ''}` : ''}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default AdminWeeksSettingsPage;
