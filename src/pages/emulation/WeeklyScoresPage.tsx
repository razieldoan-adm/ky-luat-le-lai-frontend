import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import api from "../../api/api"; // 🔹 chỉnh lại đường dẫn import API

interface ClassScore {
  className: string;
  teacherName: string;
  study: number;
  reward: number;
  violation: number;
  hygiene: number;
  attendance: number;
  lineup: number;
  disciplineTotal: number;
  total: number;
  rank: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loaded" | "calculated" | "saved" | "needsUpdate">("idle");

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/study-weeks");
        setWeeks(res.data || []);
      } catch (err) {
        console.error("Lỗi khi lấy tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  const loadData = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get(`/weekly-scores/${selectedWeek}`);
      if (res.data && res.data.scores) {
        setScores(res.data.scores);
        setStatus(res.data.status); // backend trả về status: "saved" | "raw-changed" | ...
      } else {
        setScores([]);
        setStatus("idle");
      }
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemp = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.get(`/weekly-scores/temp/${selectedWeek}`);
      setScores(res.data || []);
      setStatus("loaded");
    } catch (err) {
      console.error("Lỗi khi load temp:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRanks = () => {
    if (!scores.length) return;
    const newScores = [...scores].map((s) => ({
      ...s,
      total: s.study + s.reward + s.disciplineTotal + s.hygiene + s.attendance + s.lineup,
    }));

    newScores.sort((a, b) => b.total - a.total);
    newScores.forEach((s, i) => (s.rank = i + 1));

    setScores(newScores);
    setStatus("calculated");
  };

  const saveScores = async () => {
    if (!selectedWeek) return;
    try {
      await api.post(`/weekly-scores/${selectedWeek}`, { scores });
      setStatus("saved");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
    }
  };

  const updateScores = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.put(`/weekly-scores/update/${selectedWeek}`);
      setScores(res.data || []);
      setStatus("loaded");
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get(`/weekly-scores/export/${selectedWeek}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly-scores-week${selectedWeek}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Lỗi khi xuất Excel:", err);
    }
  };

  const handleInputChange = (index: number, field: "study" | "reward", value: number) => {
    const newScores = [...scores];
    newScores[index][field] = value;
    setScores(newScores);
    setStatus("calculated"); // khi chỉnh tay thì phải tính lại
  };

  return (
    <div>
      <h2>Bảng điểm thi đua tuần</h2>

      <Select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value as number)} displayEmpty>
        <MenuItem value="">-- Chọn tuần --</MenuItem>
        {weeks.map((w) => (
          <MenuItem key={w} value={w}>
            Tuần {w}
          </MenuItem>
        ))}
      </Select>

      <Button onClick={loadData} disabled={!selectedWeek || loading}>
        {loading ? <CircularProgress size={20} /> : "Xem dữ liệu"}
      </Button>

      {status === "idle" && (
        <Button onClick={loadTemp} disabled={!selectedWeek || loading}>
          Load dữ liệu
        </Button>
      )}
      {status === "loaded" && <Button onClick={calculateRanks}>Tính xếp hạng</Button>}
      {status === "calculated" && <Button onClick={saveScores}>Lưu</Button>}
      {status === "saved" && (
        <Button onClick={updateScores} color="warning">
          Cập nhật
        </Button>
      )}
      {scores.length > 0 && <Button onClick={exportExcel}>Xuất Excel</Button>}

      <TableContainer component={Card}>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Vi phạm</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Tổng nề nếp</TableCell>
                <TableCell>Tổng</TableCell>
                <TableCell>Hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={row.study}
                      onChange={(e) => handleInputChange(i, "study", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={row.reward}
                      onChange={(e) => handleInputChange(i, "reward", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>{row.violation}</TableCell>
                  <TableCell>{row.hygiene}</TableCell>
                  <TableCell>{row.attendance}</TableCell>
                  <TableCell>{row.lineup}</TableCell>
                  <TableCell>{row.disciplineTotal}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell>{row.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </TableContainer>
    </div>
  );
};

export default WeeklyScoresPage;
