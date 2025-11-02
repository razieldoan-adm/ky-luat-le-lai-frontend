import React, { useEffect, useState } from "react";
import {
  Box, Typography, CircularProgress, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import api from "../../api/api";

interface ClassWeeklyScore {
  _id?: string;
  className: string;
  grade: string;
  weekNumber: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  attendanceScore: number;
  academicScore: number;
  rewardScore: number;
  disciplineScore?: number;
  totalScore?: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassWeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ maxDiscipline: number }>({ maxDiscipline: 100 });
  const [hasChanges, setHasChanges] = useState(false);

  // --- Load danh sách tuần & tuần hiện tại
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/class-weekly-scores/weeks");
        const list = res.data || [];
        setWeeks(list);
        const current = Math.max(...list);
        setSelectedWeek(current);
        loadScores(current);
      } catch (err) {
        console.error("Lỗi khi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // --- Load cấu hình hệ thống
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings({ maxDiscipline: res.data?.maxDiscipline ?? 100 });
      } catch {
        setSettings({ maxDiscipline: 100 });
      }
    };
    loadSettings();
  }, []);

  // --- Load điểm tuần
  const loadScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/class-weekly-scores/weekly`, { params: { weekNumber } });
      let data: ClassWeeklyScore[] = res.data || [];

      // Tính điểm kỷ luật và tổng thi đua
      data = data.map((item) => {
        const discipline =
          settings.maxDiscipline -
          ((item.attendanceScore ?? 0) +
            (item.violationScore ?? 0) +
            (item.hygieneScore ?? 0) +
            (item.lineUpScore ?? 0));
        const total = discipline + (item.rewardScore ?? 0) + (item.academicScore ?? 0);
        return { ...item, disciplineScore: discipline, totalScore: total };
      });

      // --- Xếp hạng riêng theo khối, có đồng hạng ---
      const grades = ["6", "7", "8", "9"];
      grades.forEach((g) => {
        const filtered = data.filter((d) => d.grade === g);
        filtered.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

        let currentRank = 1;
        filtered.forEach((d, i) => {
          if (i > 0 && d.totalScore === filtered[i - 1].totalScore) {
            d.rank = filtered[i - 1].rank; // đồng hạng với lớp trước
          } else {
            d.rank = currentRank;
          }
          currentRank++;
        });
      });

      setScores(data);
      setHasChanges(false);
    } catch (err) {
      console.error("Lỗi khi tải điểm:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Khi đổi tuần
  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const w = Number(e.target.value);
    setSelectedWeek(w);
    loadScores(w);
  };

  // --- Lưu toàn bộ điểm
  const handleSave = async () => {
  try {
    if (!scores.length || !selectedWeek) {
      alert("❌ Không có dữ liệu để lưu.");
      return;
    }

    const payload = {
      records: scores.map((s) => ({
        className: s.className,
        grade: s.grade,
        weekNumber: s.weekNumber || selectedWeek,
        academicScore: s.academicScore ?? 0,
        rewardScore: s.rewardScore ?? 0,
        hygieneScore: s.hygieneScore ?? 0,
        lineupScore: s.lineUpScore ?? 0,
        attendanceScore: s.attendanceScore ?? 0,
        violationScore: s.violationScore ?? 0,
      })),
    };

    // 🔹 Gọi API mới để lưu toàn bộ điểm tuần
    const res = await api.post("/api/class-weekly-scores/save-manual", payload);

    alert("✅ " + (res.data?.message || "Đã lưu toàn bộ điểm tuần!"));
    loadScores(Number(selectedWeek));
  } catch (err) {
    console.error("❌ Lỗi khi lưu:", err);
    alert("❌ Không thể lưu dữ liệu điểm tuần!");
  }
};

  // --- Khi sửa điểm học tập hoặc thưởng
  const handleChangeScore = (
    className: string,
    field: keyof ClassWeeklyScore,
    value: number
  ) => {
    setHasChanges(true);
    setScores((prev) =>
      prev.map((s) => {
        if (s.className !== className) return s;

        // cập nhật giá trị mới
        const updated = { ...s, [field]: value };

        // tính lại điểm kỷ luật và tổng thi đua
        const discipline =
          settings.maxDiscipline -
          ((updated.attendanceScore ?? 0) * 5 +
            (updated.violationScore ?? 0) +
            (updated.hygieneScore ?? 0) +
            (updated.lineUpScore ?? 0));

        const total = discipline + (updated.rewardScore ?? 0) + (updated.academicScore ?? 0);

        return {
          ...updated,
          disciplineScore: discipline,
          totalScore: total,
        };
      })
    );
  };

  // --- Cập nhật lại thứ hạng (đồng hạng) ---
  const handleRecalculateRanks = () => {
    if (!scores.length) return;

    const grades = ["6", "7", "8", "9"];
    const updated = [...scores];

    grades.forEach((g) => {
      const filtered = updated.filter((d) => d.grade === g);
      filtered.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

      let currentRank = 1;
      filtered.forEach((d, i) => {
        if (i > 0 && d.totalScore === filtered[i - 1].totalScore) {
          d.rank = filtered[i - 1].rank; // đồng hạng với lớp trước
        } else {
          d.rank = currentRank;
        }
        currentRank++;
      });
    });

    setScores(updated);
    setHasChanges(false);
    alert("✅ Đã cập nhật lại xếp hạng!");
  };

  // --- Xuất Excel
  const handleExport = () => {
    if (!selectedWeek) return;
    window.open(`/api/class-weekly-scores/export/${selectedWeek}`, "_blank");
  };

  // --- Hàm render bảng theo khối
  const renderTable = (grade: string) => {
    const list = scores.filter((s) => s.grade === grade);
    if (!list.length) return null;

    return (
      <Box key={grade} mt={4}>
        <Typography variant="h6" fontWeight="bold" mb={1}>
          📚 Khối {grade}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
               
                <TableCell align="center">Xếp hàng</TableCell>
                <TableCell align="center">Vi phạm</TableCell>
                <TableCell align="center">Chuyên cần</TableCell>
                 <TableCell align="center">Vệ sinh</TableCell>
                <TableCell align="center">Học tập</TableCell>
                <TableCell align="center">Thưởng</TableCell>
                <TableCell align="center">Kỷ luật</TableCell>
                <TableCell align="center">Tổng thi đua</TableCell>
                <TableCell align="center">Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.className}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell align="center">{row.lineUpScore}</TableCell>
                  <TableCell align="center">{row.violationScore}</TableCell>
                  <TableCell align="center">{row.attendanceScore}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.hygieneScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "hygieneScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.academicScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "academicScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.rewardScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "rewardScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">{row.disciplineScore?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.totalScore?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        🏫 Tổng hợp điểm thi đua theo khối
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Tuần học"
          value={selectedWeek}
          onChange={handleWeekChange}
          sx={{ width: 160 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" color="primary" onClick={handleSave}>{loading ? "Đang lưu..." : "💾 Lưu điểm"}
          💾 Lưu điểm
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleRecalculateRanks}
          disabled={!hasChanges}
        >{loading ? "Đang lưu..." : "💾 Đang xếp lại hạng"}
          📊 Xếp hạng
        </Button>

        <Button variant="outlined" color="success" onClick={handleExport}>
          📤 Xuất Excel
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {renderTable("6")}
          {renderTable("7")}
          {renderTable("8")}
          {renderTable("9")}
        </>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
