import { useState, useEffect } from "react";
import api from "../api/api";
import {
  Box, Typography, MenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Stack, Paper
} from '@mui/material';

export default function ViewClassLineUpDetails() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineupDetails, setLineupDetails] = useState<any[]>([]); // danh sách lỗi chi tiết
  const [total, setTotal] = useState<number>(0);

  const lineupRuleList = [
    "Tập trung xếp hàng quá thời gian quy định",
    "Mất trật tự, đùa giỡn khi xếp hàng",
    "Mất trật tự khi di chuyển, di chuyện lộn xộn không theo hàng lối",
    'Nhiều học sinh ngồi trong lớp giờ chơi, không ra xếp hàng',
    'Mất trật tự trong khi xếp hàng giờ SHDC',
  ];

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data);
      setSelectedWeek(res.data[0]);
    } catch (err) {
      console.error("Lỗi khi tải tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const validClasses = res.data.map((cls: any) => cls.className);
      setClasses(validClasses);
      if (validClasses.length > 0) setSelectedClass(validClasses[0]);
    } catch (err) {
      console.error("Lỗi khi tải lớp:", err);
    }
  };

  const fetchLineUpDetails = async () => {
    if (!selectedWeek || !selectedClass) return;
    setLoading(true);

    try {
      const res = await api.get("/api/class-lineup-summaries/weekly", {
        params: { weekNumber: selectedWeek.weekNumber, className: selectedClass },
      });

      const data = res.data[0];
      if (!data) {
        setLineupDetails([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // data có thể chứa dạng: { dailyData: [{ day: 'T2', violations: [1,3] }, ...] }
      if (Array.isArray(data.dailyData)) {
        const formatted = data.dailyData.map((d: any) => ({
          day: d.day,
          violations: d.violations.map((v: number) => lineupRuleList[v - 1] || "Không rõ lỗi"),
        }));
        setLineupDetails(formatted);
      } else {
        setLineupDetails([]);
      }

      setTotal(data.total || 0);
    } catch (err) {
      console.error("Lỗi tải chi tiết lineup:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (selectedWeek && selectedClass) fetchLineUpDetails();
  }, [selectedWeek, selectedClass]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>📋 Chi tiết lỗi xếp hàng theo lớp</Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Tuần</InputLabel>
          <Select
            value={selectedWeek?._id || ""}
            label="Tuần"
            onChange={(e) => setSelectedWeek(weeks.find(w => w._id === e.target.value))}
          >
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w._id}>Tuần {w.weekNumber}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Lớp</InputLabel>
          <Select
            value={selectedClass}
            label="Lớp"
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#b3e5fc" }}>
                <TableCell align="center" width={100}>Thứ</TableCell>
                <TableCell align="center">Danh sách lỗi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lineupDetails.length > 0 ? (
                lineupDetails.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell align="center">{d.day}</TableCell>
                    <TableCell>
                      {d.violations.length > 0 ? (
                        d.violations.map((v: string, idx: number) => (
                          <Typography key={idx} sx={{ ml: 1 }}>• {v}</Typography>
                        ))
                      ) : (
                        <Typography color="green">✅ Không lỗi</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center">Chưa có dữ liệu tuần này</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Typography variant="h6" sx={{ mt: 2 }}>
            Tổng số lỗi tuần: <b>{total}</b>
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
