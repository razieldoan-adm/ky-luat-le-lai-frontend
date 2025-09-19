import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';

interface Violation {
  _id: string;
  description: string;
  time: string;
  handled: boolean;
  handlingMethod: string;
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

const ViolationDetailPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const className = new URLSearchParams(location.search).get('className') || '';

  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [customTime, setCustomTime] = useState<string>(''); // 👈 thời gian tự chọn

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const [maxConductScore, setMaxConductScore] = useState(100);
  const [currentWeek, setCurrentWeek] = useState<any | null>(null);

  useEffect(() => {
    fetchViolations();
    fetchRules();
    fetchSettings();
    fetchWeeks();
  }, [name, className]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/settings');
      if (res.data?.maxConductScore) {
        setMaxConductScore(res.data.maxConductScore);
      }
    } catch (err) {
      console.error('Lỗi khi lấy settings:', err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get('/api/academic-weeks/study-weeks');
      const weeks = res.data || [];
      const now = new Date();

      const week = weeks.find((w: any) => {
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        return now >= start && now <= end;
      });

      setCurrentWeek(week || null);
    } catch (err) {
      console.error('Lỗi khi lấy tuần học:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get(
        `/api/violations/${encodeURIComponent(name || '')}?className=${encodeURIComponent(className)}`
      );
      setViolations(res.data);
    } catch (err) {
      console.error('Error fetching violations:', err);
      setViolations([]);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  const getHandlingMethodByRepeatCount = (count: number) => {
    const methods = ["Nhắc nhở", "Kiểm điểm", "Chép phạt", "Báo phụ huynh", "Mời phụ huynh", "Tạm dừng việc học tập"];
    return methods[count] || "Tạm dừng việc học tập";
  };

  const handleAddViolation = async () => {
    const selectedRule = rules.find((r) => r._id === selectedRuleId);
    if (!selectedRule || !name || !className) return;

    try {
      const weeksRes = await api.get('/api/academic-weeks/study-weeks');
      const weeks = weeksRes.dat
