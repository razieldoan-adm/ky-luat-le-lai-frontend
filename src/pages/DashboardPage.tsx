import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Stack, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import api from '../api/api';


import SchoolIcon from '@mui/icons-material/School';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningIcon from '@mui/icons-material/Warning';
import StarIcon from '@mui/icons-material/Star';

interface ClassRank {
  className: string;
  rank: number;
  grade?: string; // thêm grade cho top1 mỗi khối
}

export default function Dashboard() {
  const [classCount, setClassCount] = useState(0);
  const [multipleViolationCount, setMultipleViolationCount] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [unhandledCount, setUnhandledCount] = useState(0);

  const [topClasses, setTopClasses] = useState<ClassRank[]>([]);
  const [bottomClasses, setBottomClasses] = useState<ClassRank[]>([]);
  const [top1EachGrade, setTop1EachGrade] = useState<ClassRank[]>([]);
  const fixedGrades = ['6', '7', '8', '9'];
  useEffect(() => {
    fetchCounts();
    fetchClassRanks();
    fetchTop1EachGrade();
  }, []);

  const fetchCounts = async () => {
    try {
      const [clsRes, multiRes, vioRes, unhandledRes] = await Promise.all([
        api.get('/api/classes/count'),
        api.get('/api/violations/students/multiple-violations/count'),
        api.get('/api/violations/count'),
        api.get('/api/violations/unhandled/count'),
      ]);

      setClassCount(clsRes.data.count);
      setMultipleViolationCount(multiRes.data.count);
      setViolationCount(vioRes.data.count);
      setUnhandledCount(unhandledRes.data.count);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu:', err);
    }
  };

  const fetchClassRanks = async () => {
    try {
      const [topRes, bottomRes] = await Promise.all([
        api.get('/api/class-rank/weekscores/top-continuous'),
        api.get('/api/class-rank/weekscores/bottom-continuous'),
   

      ]);

      setTopClasses(topRes.data);
      setBottomClasses(bottomRes.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách lớp xếp hạng:', err);
    }
  };

  const fetchTop1EachGrade = async () => {
    try {
      const res = await api.get('/api/class-rank/weekscores/top1-current-week');

      setTop1EachGrade(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy top1 mỗi khối:', err);
    }
  };

  const cards = [
    {
      title: 'Tổng số lớp',
      value: classCount,
      icon: <SchoolIcon sx={{ fontSize: 50, color: '#1976d2' }} />,
    },
    {
      title: 'HS vi phạm nhiều lần',
      value: multipleViolationCount,
      icon: <NotificationsActiveIcon sx={{ fontSize: 50, color: '#f9a825' }} />,
    },
    {
      title: 'Tổng số vi phạm',
      value: violationCount,
      icon: <ReportProblemIcon sx={{ fontSize: 50, color: '#d32f2f' }} />,
    },
    {
      title: 'HS chưa xử lý',
      value: unhandledCount,
      icon: <NotificationsActiveIcon sx={{ fontSize: 50, color: '#f9a825' }} />,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="flex-start" mb={4}>
        {cards.map((card, index) => (
          <Box
            key={index}
            sx={{
              flex: '1 1 200px',
              minWidth: '200px',
              maxWidth: '250px',
              m: 1,
            }}
          >
            <Card sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 3 }}>
              {card.icon}
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  {card.title}
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}

        {/* Card top 1 mỗi khối */}
        {/* Card top 1 mỗi khối */}
<Box
  sx={{
    flex: '1 1 200px',
    minWidth: '200px',
    maxWidth: '250px',
    m: 1,
  }}
>
  <Card sx={{ p: 2, borderRadius: 3 }}>
    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
      🏆 Top 1 từng khối (tuần hiện tại)
    </Typography>

    <List dense>
      {fixedGrades.map((grade) => {
        const cls = top1EachGrade.find(c => c.grade === grade);
        return (
          <ListItem key={grade}>
            <ListItemIcon>
              <StarIcon sx={{ color: '#f9a825' }} />
            </ListItemIcon>
            <ListItemText
              primary={
                cls
                  ? `Khối ${grade} - ${cls.className} - Hạng ${cls.rank}`
                  : `Khối ${grade} - Chưa có dữ liệu`
              }
            />
          </ListItem>
        );
      })}
    </List>
  </Card>
</Box>

      </Stack>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Card sx={{ flex: '1 1 300px', p: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            🏆 Lớp đạt top 2 tuần liên tiếp
          </Typography>
          <List dense>
            {topClasses.length === 0 && <ListItem><ListItemText primary="Không có dữ liệu" /></ListItem>}
            {topClasses.map((cls, idx) => (
              <ListItem key={idx}>
                <ListItemIcon><EmojiEventsIcon sx={{ color: '#1976d2' }} /></ListItemIcon>
                <ListItemText primary={`${cls.className} - Hạng ${cls.rank}`} />
              </ListItem>
            ))}
          </List>
        </Card>

        <Card sx={{ flex: '1 1 300px', p: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            ⚠️ Lớp hạng thấp 2 tuần liên tiếp
          </Typography>
          <List dense>
            {bottomClasses.length === 0 && <ListItem><ListItemText primary="Không có dữ liệu" /></ListItem>}
            {bottomClasses.map((cls, idx) => (
              <ListItem key={idx}>
                <ListItemIcon><WarningIcon sx={{ color: '#d32f2f' }} /></ListItemIcon>
                <ListItemText primary={`${cls.className} - Hạng ${cls.rank}`} />
              </ListItem>
            ))}
          </List>
        </Card>
      </Box>
    </Box>
  );
}
