// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api/api";

interface ClassScore {
  _id?: string;
  className: string;
  grade: number;
  discipline: number;
  attendance: number;
  hygiene: number;
  ranking: number;
  reward: number;
  study: number;
  totalDiscipline?: number;
  total?: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{ disciplineMax: number }>({ disciplineMax: 100 });
  const [updated, setUpdated] = useState(false); // để kiểm soát nút cập nhật

  // Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    api.get("/class-weekly-scores/weeks").then((res) => {
      setWeeks(res.data);
    });
    api.get("/settings").then((res) => {
      setSettings({ disciplineMax: res.data?.disciplineMax ?? 100 });
    });
  }, []);

  // Hàm tính điểm + xếp hạng trong từng khối
  const recalcScores = (list: ClassScore[]) => {
    const grouped: Record<number, ClassScore[]> = {};
    list.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    Object.values(grouped).forEach((arr) => {
      arr.forEach((s) => {
        const totalDiscipline =
          settings.disciplineMax -
          (s.discipline + s.ranking + s.hygiene + s.attendance * 5);
        const total = totalDiscipline + (s.reward ?? 0) - (s.study ?? 0);
        s.totalDiscipline = totalDiscipline;
        s.total = total;
      });
      arr.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
      arr.forEach((s, idx) => {
        s.rank = idx + 1;
      });
    });
    return list;
  };

  // Khi chọn tuần
  const handleWeekChange = async (week: number) => {
    setSelectedWeek(week);
    setScores([]);
    if (!week) return;
    setLoading(true);
    try {
      const res = await api.get(`/class-weekly-scores?weekNumber=${week}`);
      if (res.data && res.data.length > 0) {
        setScores(recalcScores(res.data));
      } else {
        // chưa có dữ liệu -> yêu cầu load
        const temp = await api.get(`/class-weekly-scores/temp?weekNumber=${week}`);
        setScores(recalcScores(temp.data));
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Nhập trực tiếp điểm thưởng/học tập
  const handleCellChange = (className: string, field: "reward" | "study", value: number) => {
    const newScores = scores.map((s) =>
      s.className === className ? { ...s, [field]: value } : s
    );
    setScores(recalcScores(newScores));
    setUpdated(true);
  };

  // Lưu dữ liệu tuần
  const handleSave = async () => {
    if (!selectedWeek) return;
    setSaving(true);
    try {
      await api.post("/class-weekly-scores/save", {
        weekNumber: selectedWeek,
        scores,
      });
      setUpdated(false);
      alert("Đã lưu thành công!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu!");
    } finally {
      setSaving(false);
    }
  };

  // Cập nhật lại dữ liệu từ DB
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post(`/class-weekly-scores/update?weekNumber=${selectedWeek}`);
      setScores(recalcScores(res.data));
      setUpdated(false);
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render bảng theo từng khối
  const renderTable = (grade: number) => {
    const list = scores.filter((s) => s.grade === grade);
    if (list.length === 0) return null;
    return (
      <Box key={grade} mb={4}>
        <Typography variant="h6" gutterBottom>
          Khối {grade}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Xếp hàng</TableCell>
              <TableCell>Điểm thưởng</TableCell>
              <TableCell>Điểm học tập</TableCell>
              <TableCell>Tổng Kỷ luật</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((s) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.discipline}</TableCell>
                <TableCell>{s.attendance}</TableCell>
                <TableCell>{s.hygiene}</TableCell>
                <TableCell>{s.ranking}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={s.reward ?? 0}
                    onChange={(e) => handleCellChange(s.className, "reward", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={s.study ?? 0}
                    onChange={(e) => handleCellChange(s.className, "study", Number(e.target.value))}
                  />
                </TableCell>
                <TableCell>{s.totalDiscipline ?? ""}</TableCell>
                <TableCell>{s.total ?? ""}</TableCell>
                <TableCell>{s.rank ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Box mb={2} display="flex" alignItems="center" gap={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          size="small"
          value={selectedWeek}
          onChange={(e) => handleWeekChange(Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
            <MenuItem key={w} value={w} disabled={weeks.includes(w)}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>

        <Button
          variant="contained"
          onClick={handleUpdate}
          disabled={!selectedWeek || loading || !updated}
        >
          {loading ? <CircularProgress size={20} /> : "Cập nhật"}
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={!selectedWeek || saving}
        >
          {saving ? <CircularProgress size={20} /> : "Lưu dữ liệu"}
        </Button>
      </Box>

      {loading ? <CircularProgress /> : [6, 7, 8, 9].map((g) => renderTable(g))}
    </Box>
  );
};

export default WeeklyScoresPage;
