import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Paper,
  Stack
} from '@mui/material';
import api from '../../api/api';

interface Settings {
  maxConductScore: number;
  minAcademicCountToRank: number;
  maxClassAcademicScoresByGrade: { [grade: string]: number };
  disciplinePointDeduction: {
    lineup: number;
    hygiene: number;
  };
  maxWeeklyDisciplineScore: number;
  maxWeeklyAttendanceScore: number;
  maxWeeklyHygieneScore: number;
  backgroundImagePC: string;
  backgroundImageMobile: string;
  backgroundImagePC: '',
  backgroundImageMobile: '',
}

export default function AdminSettingPage() {
  const [settings, setSettings] = useState<Settings>({
    maxConductScore: 100,
    minAcademicCountToRank: 5,
    maxClassAcademicScoresByGrade: { '6': 10, '7': 10, '8': 10, '9': 10 },
    disciplinePointDeduction: {
      lineup: 10,
      hygiene: 10,
    },
      maxWeeklyDisciplineScore: 100,
  maxWeeklyAttendanceScore: 100,
  maxWeeklyHygieneScore: 100,
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch settings from API on load
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const handleChange = (field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLimitChange = (grade: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      maxClassAcademicScoresByGrade: {
        ...prev.maxClassAcademicScoresByGrade,
        [grade]: value,
      },
    }));
  };

  const handleDisciplineChange = (type: 'lineup' | 'hygiene', value: number) => {
    setSettings(prev => ({
      ...prev,
      disciplinePointDeduction: {
        ...prev.disciplinePointDeduction,
        [type]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      await api.put('/api/settings', settings);
      setSnackbar({ open: true, message: 'Đã lưu cấu hình hệ thống.', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi lưu settings:', err);
      setSnackbar({ open: true, message: 'Lỗi khi lưu.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        ⚙️ Cấu hình hệ thống
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
            🖼️ Hình nền trang chủ
          </Typography>
          
          <TextField
            fullWidth
            label="URL hình nền máy tính (PC)"
            value={settings.backgroundImagePC}
            onChange={(e) =>
              setSettings(prev => ({
                ...prev,
                backgroundImagePC: e.target.value,
              }))
            }
            placeholder="https://..."
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="URL hình nền điện thoại (Mobile)"
            value={settings.backgroundImageMobile}
            onChange={(e) =>
              setSettings(prev => ({
                ...prev,
                backgroundImageMobile: e.target.value,
              }))
            }
            placeholder="https://..."
            sx={{ mb: 2 }}
          />
        {settings.backgroundImagePC && (
            <Box
              sx={{
                width: '100%',
                height: 180,
                mb: 2,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #ddd',
              }}
            >
              <img
                src={settings.backgroundImagePC}
                alt="Preview hình nền PC"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          )}
        <Typography variant="h6" gutterBottom>Điểm hạnh kiểm tối đa</Typography>
        <TextField
          type="number"
          value={settings.maxConductScore}
          onChange={(e) => handleChange('maxConductScore', parseInt(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Typography variant="h6" gutterBottom>Số đầu bài tối thiểu để xếp hạng thi đua</Typography>
        <TextField
          type="number"
          value={settings.minAcademicCountToRank}
          onChange={(e) => handleChange('minAcademicCountToRank', parseInt(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Typography variant="h6" gutterBottom>Giới hạn điểm số đầu bài theo khối</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          {Object.entries(settings.maxClassAcademicScoresByGrade).map(([grade, limit]) => (
            <TextField
              key={grade}
              label={`Khối ${grade}`}
              type="number"
              value={limit}
              onChange={(e) => handleLimitChange(grade, parseInt(e.target.value))}
              sx={{ width: 100 }}
            />
          ))}
        </Stack>

        <Typography variant="h6" gutterBottom>Giới hạn điểm trừ xếp hàng & vệ sinh</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Xếp hàng (lineup)"
            type="number"
            value={settings.disciplinePointDeduction.lineup}
            onChange={(e) => handleDisciplineChange('lineup', parseInt(e.target.value))}
            sx={{ width: 150 }}
          />
          <TextField
            label="Vệ sinh (hygiene)"
            type="number"
            value={settings.disciplinePointDeduction.hygiene}
            onChange={(e) => handleDisciplineChange('hygiene', parseInt(e.target.value))}
            sx={{ width: 150 }}
          />
        </Stack>
          <Typography variant="h6" gutterBottom>Giới hạn điểm tối đa tuần (kỷ luật)</Typography>
        <TextField
          type="number"
          value={settings.maxWeeklyDisciplineScore || 0}
          onChange={(e) => handleChange('maxWeeklyDisciplineScore', parseInt(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Typography variant="h6" gutterBottom>Giới hạn điểm tối đa tuần (chuyên cần)</Typography>
        <TextField
          type="number"
          value={settings.maxWeeklyAttendanceScore || 0}
          onChange={(e) => handleChange('maxWeeklyAttendanceScore', parseInt(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Typography variant="h6" gutterBottom>Giới hạn điểm tối đa tuần (vệ sinh)</Typography>
        <Typography variant="h6" gutterBottom></Typography>
        <TextField
          type="number"
          value={settings.maxWeeklyHygieneScore || 0}
          onChange={(e) => handleChange('maxWeeklyHygieneScore', parseInt(e.target.value))}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          💾 Lưu cấu hình
        </Button>
      </Box>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as 'success' | 'error' | 'info' | 'warning'}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
