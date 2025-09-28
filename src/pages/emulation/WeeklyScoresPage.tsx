// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";

interface WeeklyScore {
  _id: string;
  className: string;
  week: number;
  score: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // 🔹 Hàm tính hạng từ dữ liệu hiện có
  const calculateRanks = (data: WeeklyScore[]): WeeklyScore[] => {
    const sorted = [...data].sort((a, b) => b.score - a.score);
    return data.map((item) => ({
      ...item,
      rank: sorted.findIndex((s) => s._id === item._id) + 1,
    }));
  };

  // 🔹 Load dữ liệu từ API
  const fetchScores = async () => {
    try {
      setLoading(true);
      const res = await axios.get<WeeklyScore[]>("/api/class-weekly-scores");
      setScores(calculateRanks(res.data));
    } catch (err) {
      console.error("Error fetching weekly scores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  // 🔹 Khi thay đổi điểm trong ô nhập
  const handleScoreChange = (id: string, value: number) => {
    setEditingScores((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // 🔹 Cập nhật điểm + tính lại rank
  const handleUpdate = async (id: string) => {
    if (!(id in editingScores)) return;
    try {
      setSaving(true);
      const newScore = editingScores[id];
      await axios.put(`/api/class-weekly-scores/${id}`, { score: newScore });

      // Cập nhật local state
      const updated = scores.map((s) =>
        s._id === id ? { ...s, score: newScore } : s
      );
      setScores(calculateRanks(updated));

      setEditingScores((prev) => {
        const updatedEdits = { ...prev };
        delete updatedEdits[id];
        return updatedEdits;
      });
    } catch (err) {
      console.error("Error updating score:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Điểm thi đua hàng tuần
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Tuần</TableCell>
                <TableCell>Điểm</TableCell>
                <TableCell>Xếp hạng</TableCell>
                <TableCell>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.week}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={
                        editingScores[row._id] !== undefined
                          ? editingScores[row._id]
                          : row.score
                      }
                      onChange={(e) =>
                        handleScoreChange(row._id, Number(e.target.value))
                      }
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell>{row.rank ?? "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={saving || !(row._id in editingScores)}
                      onClick={() => handleUpdate(row._id)}
                    >
                      Cập nhật
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
