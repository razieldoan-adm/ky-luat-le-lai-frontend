import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Button, Grid, Typography
} from '@mui/material';
import api from '../../api/api';

const WeeklyScoresPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [weeks, setWeeks] = useState<string[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [isDirty, setIsDirty] = useState(false);

  // Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get('/weekly-scores/weeks');
        setWeeks(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách tuần:', err);
      }
    };
    fetchWeeks();
  }, []);

  // Lấy danh sách lớp có GVCN
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/api/classes/with-teacher');
        setClassOptions(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // Lấy điểm của tuần
  const fetchWeeklyScores = async (week: string) => {
    try {
      const res = await api.get(`/weekly-scores?week=${week}`);
      const data = res.data.map((row: any) => ({
        ...row,
        academicScore: row.academicScore ?? 0,
        bonusScore: row.bonusScore ?? 0
      }));
      setWeeklyData(recalculate(data));
      setIsDirty(false);
    } catch (err) {
      console.error('Lỗi khi lấy điểm tuần:', err);
    }
  };

  // Hàm tính toán lại totalScore & ranking
  const recalculate = (data: any[]) => {
    // Tính totalScore
    const withTotal = data.map(row => ({
      ...row,
      totalScore:
        disciplineMax -
        (row.attendanceScore * 5 +
          row.hygieneScore +
          row.lineUpScore +
          row.violationScore) +
        row.academicScore +
        row.bonusScore
    }));

    // Chia theo khối rồi xếp hạng trong từng khối
    const grades = [6, 7, 8, 9];
    const result: any[] = [];

    grades.forEach(grade => {
      const inGrade = withTotal.filter(r => r.grade === grade);
      const sorted = [...inGrade].sort((a, b) => b.totalScore - a.totalScore);
      sorted.forEach((row, idx) => {
        result.push({ ...row, ranking: idx + 1 });
      });
    });

    return result;
  };

  // Xử lý thay đổi điểm học tập/thưởng
  const handleScoreChange = (classId: string, field: string, value: number) => {
    const updated = weeklyData.map(row =>
      row.classId === classId ? { ...row, [field]: value } : row
    );
    setWeeklyData(recalculate(updated));
    setIsDirty(true);
  };

  // Lưu cập nhật
  const handleUpdate = async () => {
    try {
      await api.post('/weekly-scores/update', {
        week: selectedWeek,
        data: weeklyData.map(({ classId, academicScore, bonusScore }) => ({
          classId,
          academicScore,
          bonusScore
        }))
      });
      setIsDirty(false);
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
    }
  };

  // Xuất Excel
  const handleExport = async () => {
    try {
      const res = await api.get(`/weekly-scores/export?week=${selectedWeek}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weekly_scores_${selectedWeek}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Lỗi khi xuất Excel:', err);
    }
  };

  // Render bảng theo từng khối
  const renderTable = (grade: number) => {
    const rows = weeklyData.filter(row => row.grade === grade);
    if (rows.length === 0) return null;

    return (
      <TableContainer component={Paper} style={{ marginBottom: 32 }}>
        <Typography variant="h6" align="center" sx={{ padding: 1 }}>
          Khối {grade}
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Điểm chuyên cần</TableCell>
              <TableCell>Điểm vệ sinh</TableCell>
              <TableCell>Điểm xếp hàng</TableCell>
              <TableCell>Điểm vi phạm</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow
                key={row.classId}
                style={{
                  backgroundColor:
                    row.ranking === 1
                      ? '#FFD700'
                      : row.ranking === 2
                      ? '#C0C0C0'
                      : row.ranking === 3
                      ? '#CD7F32'
                      : 'transparent'
                }}
              >
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.lineUpScore}</TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.academicScore}
                    onChange={e =>
                      handleScoreChange(
                        row.classId,
                        'academicScore',
                        Number(e.target.value)
                      )
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.bonusScore}
                    onChange={e =>
                      handleScoreChange(
                        row.classId,
                        'bonusScore',
                        Number(e.target.value)
                      )
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{row.totalScore}</TableCell>
                <TableCell>{row.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <div>
      <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
        <Grid item>
          <TextField
            select
            SelectProps={{ native: true }}
            label="Chọn tuần"
            value={selectedWeek}
            onChange={e => {
              setSelectedWeek(e.target.value);
              fetchWeeklyScores(e.target.value);
            }}
          >
            <option value="">--Chọn tuần--</option>
            {weeks.map(week => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </TextField>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            disabled={!isDirty || !selectedWeek}
          >
            Cập nhật
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleExport}
            disabled={!selectedWeek}
          >
            Xuất Excel
          </Button>
        </Grid>
      </Grid>

      {renderTable(6)}
      {renderTable(7)}
      {renderTable(8)}
      {renderTable(9)}
    </div>
  );
};

export default WeeklyScoresPage;
