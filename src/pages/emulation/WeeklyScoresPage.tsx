import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Button, Grid, Typography, MenuItem // Thêm MenuItem cho Select
} from '@mui/material';
import api from '../../api/api';

const WeeklyScoresPage: React.FC = () => {
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [weeks, setWeeks] = useState<string[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Thêm state loading

  // --- 1. Lấy danh sách tuần đã có dữ liệu
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

  // --- 2. Lấy danh sách lớp có GVCN (Dữ liệu nền)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // Endpoint này đảm bảo chỉ lấy các lớp CÓ GVCN
        const res = await api.get('/api/classes/with-teacher');
        setClassOptions(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // --- 3. Lấy điểm của tuần
  const fetchWeeklyScores = async (week: string) => {
    if (!week) return;
    setIsLoading(true);
    try {
      // Endpoint này nên chỉ trả về điểm của các lớp có trong classOptions
      const res = await api.get(`/weekly-scores?week=${week}`);
      const data = res.data.map((row: any) => ({
        ...row,
        // Đảm bảo các trường điểm có giá trị mặc định để tránh lỗi tính toán
        academicScore: row.academicScore ?? 0, 
        bonusScore: row.bonusScore ?? 0
      }));
      setWeeklyData(recalculate(data));
      setIsDirty(false);
    } catch (err) {
      console.error('Lỗi khi lấy điểm tuần:', err);
    } finally {
        setIsLoading(false);
    }
  };

  // --- 4. Hàm tính toán lại totalScore & ranking
  const recalculate = (data: any[]) => {
    // Tính totalScore
    const withTotal = data.map(row => ({
      ...row,
      totalScore:
        disciplineMax -
        (row.attendanceScore * 5 + // Ví dụ: nhân chuyên cần với 5
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
      // Sắp xếp giảm dần theo totalScore
      const sorted = [...inGrade].sort((a, b) => b.totalScore - a.totalScore); 
      sorted.forEach((row, idx) => {
        result.push({ ...row, ranking: idx + 1 });
      });
    });

    return result;
  };

  // --- 5. Xử lý thay đổi điểm học tập/thưởng
  const handleScoreChange = (classId: string, field: string, value: number) => {
    // Đảm bảo giá trị là số và không âm (hoặc theo logic nghiệp vụ của bạn)
    const numericValue = Math.max(0, Number(value)); 

    const updated = weeklyData.map(row =>
      row.classId === classId ? { ...row, [field]: numericValue } : row
    );
    // Tính toán lại ngay lập tức khi điểm thay đổi
    setWeeklyData(recalculate(updated)); 
    setIsDirty(true);
  };

  // --- 6. Lưu cập nhật
  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await api.post('/weekly-scores/update', {
        week: selectedWeek,
        // Chỉ gửi những trường cần thiết để cập nhật (academicScore và bonusScore)
        data: weeklyData.map(({ classId, academicScore, bonusScore }) => ({
          classId,
          academicScore,
          bonusScore
        }))
      });
      setIsDirty(false);
      alert('Cập nhật thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
      alert('Cập nhật thất bại. Vui lòng kiểm tra console.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- 7. Xuất Excel (Giữ nguyên)
  const handleExport = async () => {
    // ... (logic export giữ nguyên)
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

  // --- 8. Render bảng theo từng khối
  const renderTable = (grade: number) => {
    // Lớp đã được lọc từ API /weekly-scores (thường chỉ bao gồm các lớp có GVCN)
    const rows = weeklyData.filter(row => row.grade === grade); 
    if (rows.length === 0) return null;

    return (
      <TableContainer component={Paper} style={{ marginBottom: 32 }}>
        <Typography variant="h6" align="center" sx={{ padding: 1, backgroundColor: '#f5f5f5' }}>
          Khối {grade}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow style={{ backgroundColor: '#e0e0e0' }}>
              <TableCell>Lớp</TableCell>
              <TableCell align="center">Chuyên cần (x5)</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Xếp hàng</TableCell>
              <TableCell align="center">Vi phạm</TableCell>
              <TableCell align="center">Học tập **(Cập nhật)**</TableCell>
              <TableCell align="center">Thưởng **(Cập nhật)**</TableCell>
              <TableCell align="center">Tổng điểm</TableCell>
              <TableCell align="center">Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow
                key={row.classId}
                hover
                style={{
                  // Màu sắc nổi bật cho Top 3
                  backgroundColor:
                    row.ranking === 1 ? '#FFD70030' // Vàng nhạt
                      : row.ranking === 2 ? '#C0C0C030' // Bạc nhạt
                        : row.ranking === 3 ? '#CD7F3230' // Đồng nhạt
                          : 'transparent'
                }}
              >
                <TableCell component="th" scope="row">
                    **{row.className}**
                </TableCell>
                <TableCell align="center">{row.attendanceScore}</TableCell>
                <TableCell align="center">{row.hygieneScore}</TableCell>
                <TableCell align="center">{row.lineUpScore}</TableCell>
                <TableCell align="center">{row.violationScore}</TableCell>
                
                {/* Trường nhập điểm Học tập */}
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
                    variant="outlined"
                    sx={{ width: 80 }}
                  />
                </TableCell>

                {/* Trường nhập điểm Thưởng */}
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
                    variant="outlined"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                
                <TableCell align="center">
                    **{row.totalScore.toFixed(2)}** {/* Hiển thị 2 chữ số thập phân */}
                </TableCell>
                <TableCell align="center">
                    **#{row.ranking}**
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
          Quản lý Điểm thi đua Tuần
      </Typography>
      <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 4 }}>
        <Grid item>
            {/* Thay thế select native bằng TextField select của Material-UI để đẹp hơn */}
          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={e => {
              setSelectedWeek(e.target.value);
              fetchWeeklyScores(e.target.value);
            }}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">--Chọn tuần--</MenuItem>
            {weeks.map(week => (
              <MenuItem key={week} value={week}>
                Tuần {week}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            // Vô hiệu hóa khi chưa chọn tuần, không có thay đổi hoặc đang loading
            disabled={!isDirty || !selectedWeek || isLoading} 
          >
            {isLoading ? 'Đang lưu...' : '💾 Cập nhật'}
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleExport}
            disabled={!selectedWeek || isLoading}
          >
            ⬇️ Xuất Excel
          </Button>
        </Grid>
      </Grid>

      {/* Thông báo loading hoặc chưa chọn tuần */}
      {isLoading && <Typography variant="body1" color="textSecondary">Đang tải dữ liệu...</Typography>}
      {!selectedWeek && !isLoading && (
        <Typography variant="body1" color="textSecondary">
            Vui lòng chọn một tuần để xem dữ liệu.
        </Typography>
      )}

      {/* Render bảng điểm của các khối */}
      {selectedWeek && !isLoading && (
        <>
            {renderTable(6)}
            {renderTable(7)}
            {renderTable(8)}
            {renderTable(9)}
        </>
      )}
    </div>
  );
};

export default WeeklyScoresPage;
