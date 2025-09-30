import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import api from "../../api/api";

interface WeeklyScore {
  id?: string;
  className: string;
  grade: number;
  discipline: number;
  lineup: number;
  hygiene: number;
  attendance: number;
  reward: number;
  academic: number;
  disciplineTotal?: number;
  total?: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedWeeks, setSavedWeeks] = useState<number[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [isSaved, setIsSaved] = useState(false);

  // ===== Load settings + tuần đã lưu =====
  useEffect(() => {
    fetchSettings();
    fetchSavedWeeks();
  }, []);

  useEffect(() => {
    if (savedWeeks.includes(weekNumber)) {
      fetchSavedData(weekNumber);
      setIsSaved(true);
    } else {
      setScores([]);
      setIsSaved(false);
    }
  }, [weekNumber, savedWeeks]);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      setDisciplineMax(res.data?.disciplineMax ?? 100);
    } catch (err) {
      console.error("Load settings error", err);
    }
  };

  const fetchSavedWeeks = async () => {
    try {
      const res = await api.get("/class-weekly-scores/weeks");
      setSavedWeeks(res.data || []);
    } catch (err) {
      console.error("Load saved weeks error", err);
    }
  };

  const fetchSavedData = async (week: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/class-weekly-scores?weekNumber=${week}`);
      const data = calculateScores(res.data);
      setScores(data);
    } catch (err) {
      console.error("Load saved weekly scores error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTempData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/class-weekly-scores/temp?weekNumber=${weekNumber}`);
      const data = calculateScores(res.data);
      setScores(data);
      setIsSaved(false);
    } catch (err) {
      console.error("Load temp weekly scores error", err);
    } finally {
      setLoading(false);
    }
  };

  // ===== Tính toán điểm + xếp hạng =====
  const calculateScores = (raw: WeeklyScore[]): WeeklyScore[] => {
    const updated = raw.map((s) => {
      const disciplineTotal =
        disciplineMax - (s.discipline + s.lineup + s.hygiene + s.attendance * 5);
      const total = disciplineTotal + s.reward - s.academic;
      return { ...s, disciplineTotal, total };
    });

    // Xếp hạng theo từng khối (grade)
    const grouped: { [key: number]: WeeklyScore[] } = {};
    updated.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    Object.keys(grouped).forEach((grade) => {
      grouped[grade]
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
        .forEach((s, idx) => (s.rank = idx + 1));
    });

    return updated;
  };

  // ===== Các thao tác =====
  const handleSave = async () => {
    try {
      await api.post("/class-weekly-scores/save", {
        weekNumber,
        scores,
      });
      fetchSavedWeeks();
      setIsSaved(true);
    } catch (err) {
      console.error("Save error", err);
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await api.post(`/class-weekly-scores/update/${weekNumber}`);
      const data = calculateScores(res.data);
      setScores(data);
      setIsSaved(true);
    } catch (err) {
      console.error("Update error", err);
    }
  };

  const handleExport = () => {
    window.open(`/api/class-weekly-scores/export/${weekNumber}`, "_blank");
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/class-weekly-scores/${weekNumber}`);
      fetchSavedWeeks();
      setScores([]);
      setIsSaved(false);
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // ===== Cột DataGrid =====
  const columns: GridColDef[] = [
    { field: "className", headerName: "Lớp", width: 100 },
    { field: "discipline", headerName: "Kỷ luật", width: 90, editable: false },
    { field: "lineup", headerName: "Xếp hàng", width: 90, editable: false },
    { field: "hygiene", headerName: "Vệ sinh", width: 90, editable: false },
    { field: "attendance", headerName: "Chuyên cần", width: 110, editable: false },
    { field: "disciplineTotal", headerName: "Tổng kỷ luật", width: 120 },
    { field: "reward", headerName: "Điểm thưởng", width: 120, editable: true },
    { field: "academic", headerName: "Điểm học tập", width: 120, editable: true },
    { field: "total", headerName: "Tổng điểm", width: 120 },
    { field: "rank", headerName: "Hạng", width: 80 },
  ];

  // ===== Handle nhập trực tiếp (reward, academic) =====
  const handleProcessRowUpdate = (newRow: any, oldRow: any) => {
    const updated = scores.map((s) => (s.className === newRow.className ? newRow : s));
    return calculateScores(updated).find((s) => s.className === newRow.className)!;
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      <FormControl sx={{ minWidth: 200, mr: 2 }}>
        <InputLabel>Chọn tuần</InputLabel>
        <Select value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))}>
          {Array.from({ length: 20 }).map((_, i) => {
            const w = i + 1;
            const hasData = savedWeeks.includes(w);
            return (
              <MenuItem key={w} value={w} style={{ color: hasData ? "green" : "black" }}>
                Tuần {w} {hasData ? "(đã lưu)" : ""}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        sx={{ mr: 1 }}
        onClick={fetchTempData}
        disabled={isSaved}
      >
        Load dữ liệu
      </Button>
      <Button
        variant="contained"
        color="success"
        sx={{ mr: 1 }}
        onClick={handleSave}
        disabled={isSaved || scores.length === 0}
      >
        Lưu dữ liệu
      </Button>
      <Button variant="contained" color="warning" sx={{ mr: 1 }} onClick={handleUpdate}>
        Cập nhật
      </Button>
      <Button variant="contained" color="info" sx={{ mr: 1 }} onClick={handleExport}>
        Xuất Excel
      </Button>
      <Button variant="contained" color="error" onClick={handleDelete}>
        Xoá tuần
      </Button>

      <Box mt={3}>
        {loading ? (
          <CircularProgress />
        ) : (
          <DataGrid
            rows={scores.map((s, i) => ({ id: i + 1, ...s }))}
            columns={columns}
            pageSize={20}
            autoHeight
            disableRowSelectionOnClick
            processRowUpdate={handleProcessRowUpdate}
            experimentalFeatures={{ newEditingApi: true }}
          />
        )}
      </Box>
    </Box>
  );
};

export default WeeklyScoresPage;
