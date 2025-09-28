// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  weekNumber: number;
  name: string;
}

interface ScoreRow {
  className: string;
  study: number;
  reward: number;
  violation: number;
  hygiene: number;
  attendance: number;
  rankOrder: number;
  totalDiscipline: number;
  total: number;
  rank: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weekList, setWeekList] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);

  // trạng thái nút
  const [status, setStatus] = useState<
    "idle" | "loaded" | "calculated" | "saved" | "needsUpdate"
  >("idle");

  // lấy danh sách tuần
  const fetchWeeks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
      const initialWeek = res.data[0];
      if (initialWeek) {
        setSelectedWeek(initialWeek);
        await initializeData(initialWeek.weekNumber);
      }
    } catch (err) {
      console.error("Error fetching weeks:", err);
    }
    setLoading(false);
  };

  // khởi tạo dữ liệu tuần
  const initializeData = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/emulation/${weekNumber}`);
      if (res.data?.saved) {
        setScores(res.data.scores);
        setStatus("saved");
      } else {
        setScores([]);
        setStatus("idle");
      }
    } catch (err) {
      console.error("Error initialize data:", err);
    }
    setLoading(false);
  };

  // Load dữ liệu (temp)
  const handleLoadData = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/emulation/load/${selectedWeek.weekNumber}`);
      setScores(res.data);
      setStatus("loaded");
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setLoading(false);
  };

  // Cập nhật dữ liệu khi raw-data thay đổi
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/emulation/update/${selectedWeek.weekNumber}`);
      setScores(res.data);
      setStatus("loaded");
    } catch (err) {
      console.error("Error updating data:", err);
    }
    setLoading(false);
  };

  // Tính xếp hạng
  const handleCalculate = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/emulation/calculate/${selectedWeek.weekNumber}`, {
        scores,
      });
      setScores(res.data);
      setStatus("calculated");
    } catch (err) {
      console.error("Error calculating:", err);
    }
    setLoading(false);
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    if (!selectedWeek) return;
    setLoading(true);
    try {
      await api.post(`/api/emulation/save/${selectedWeek.weekNumber}`, { scores });
      setStatus("saved");
    } catch (err) {
      console.error("Error saving:", err);
    }
    setLoading(false);
  };

  // Xuất Excel
  const handleExport = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get(`/api/emulation/export/${selectedWeek.weekNumber}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly-scores-${selectedWeek.weekNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Error exporting:", err);
    }
  };

  // khi chỉnh điểm học tập / thưởng
  const handleChangeScore = (
    index: number,
    field: "study" | "reward",
    value: number
  ) => {
    const updated = [...scores];
    updated[index][field] = value;
    setScores(updated);
    setStatus("loaded"); // sau khi sửa điểm cần tính lại
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Bảng điểm thi đua tuần {selectedWeek?.weekNumber}
      </Typography>

      {loading && <CircularProgress />}

      {!loading && (
        <>
          <div style={{ marginBottom: 16 }}>
            {status === "idle" && (
              <Button variant="contained" onClick={handleLoadData}>
                Load dữ liệu
              </Button>
            )}
            {status === "needsUpdate" && (
              <Button variant="contained" color="warning" onClick={handleUpdate}>
                Cập nhật
              </Button>
            )}
            {status === "loaded" && (
              <Button variant="contained" onClick={handleCalculate}>
                Tính xếp hạng
              </Button>
            )}
            {status === "calculated" && (
              <Button variant="contained" color="success" onClick={handleSave}>
                Lưu
              </Button>
            )}
            {status === "saved" && (
              <Typography variant="body2" color="green">
                ✅ Đã lưu
              </Typography>
            )}
            {scores.length > 0 && (
              <Button
                variant="outlined"
                sx={{ ml: 2 }}
                onClick={handleExport}
              >
                Xuất Excel
              </Button>
            )}
          </div>

          {scores.length > 0 && (
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
                {scores.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={row.study}
                        onChange={(e) =>
                          handleChangeScore(idx, "study", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={row.reward}
                        onChange={(e) =>
                          handleChangeScore(idx, "reward", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>{row.violation}</TableCell>
                    <TableCell>{row.hygiene}</TableCell>
                    <TableCell>{row.attendance}</TableCell>
                    <TableCell>{row.rankOrder}</TableCell>
                    <TableCell>{row.totalDiscipline}</TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.rank}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </Paper>
  );
};

export default WeeklyScoresPage;
