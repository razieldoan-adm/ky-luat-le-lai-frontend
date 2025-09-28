import React, { useEffect, useState } from "react";
import {
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import api from "../../api/api";

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<any[]>([]);
  const [isRanked, setIsRanked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // load danh sách tuần
  useEffect(() => {
    const loadWeeks = async () => {
      const res = await api.get("/api/weeks");
      setWeeks(res.data);
    };
    loadWeeks();
  }, []);

  // load dữ liệu tuần khi chọn
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchData = async () => {
      const res = await api.get(
        `/api/class-weekly-scores?weekNumber=${selectedWeek}`
      );
      setScores(res.data);
      setIsRanked(res.data.some((s: any) => s.ranking && s.ranking > 0));
      setIsSaved(res.data.length > 0);
      setHasChanges(false);
    };
    fetchData();
  }, [selectedWeek]);

  // tính tổng điểm
  const calcTotal = (s: any, field: string, value: number) => {
    const updated = { ...s, [field]: value };
    return (
      (updated.attendanceScore ?? 0) +
      (updated.hygieneScore ?? 0) +
      (updated.lineUpScore ?? 0) +
      (updated.academicScore ?? 0) +
      (updated.bonusScore ?? 0) -
      (updated.violationScore ?? 0)
    );
  };

  // chỉnh sửa điểm trực tiếp
  const handleScoreChange = (
    className: string,
    field: string,
    value: number
  ) => {
    const updated = scores.map((s) =>
      s.className === className
        ? { ...s, [field]: value, totalScore: calcTotal(s, field, value) }
        : s
    );
    setScores(updated);
    setIsRanked(false);
    setIsSaved(false);
    setHasChanges(true);
  };

  // load dữ liệu tạm
  const handleLoadData = async () => {
    const res = await api.get(
      `/api/class-weekly-scores/temp?weekNumber=${selectedWeek}`
    );
    setScores(res.data);
    setIsRanked(false);
    setIsSaved(false);
    setHasChanges(true);
  };

  // tính + xếp hạng
  const handleRankScores = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    ranked.forEach((s, i) => (s.ranking = i + 1));
    setScores(ranked);
    setIsRanked(true);
    setIsSaved(false);
    setHasChanges(true);
  };

  // cập nhật (tự tính lại + xếp hạng)
  const handleUpdateScores = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    ranked.forEach((s, i) => (s.ranking = i + 1));
    setScores(ranked);
    setIsRanked(true);
    setIsSaved(false);
    setHasChanges(true);
  };

  // lưu dữ liệu
  const handleSaveScores = async () => {
    await api.post("/api/class-weekly-scores/save", {
      weekNumber: selectedWeek,
      scores,
    });
    setIsSaved(true);
    setHasChanges(false);
  };

  // render nút theo flow
  const renderActionButton = () => {
    if (!scores.length) {
      return <Button onClick={handleLoadData}>Load dữ liệu</Button>;
    }
    if (hasChanges && !isRanked) {
      return <Button onClick={handleUpdateScores}>Cập nhật</Button>;
    }
    if (isRanked && !isSaved) {
      return <Button onClick={handleSaveScores}>Lưu</Button>;
    }
    if (isSaved) {
      return <Button disabled>Đã lưu</Button>;
    }
    return <Button onClick={handleRankScores}>Tính xếp hạng</Button>;
  };

  return (
    <Paper sx={{ p: 2 }}>
      <FormControl sx={{ minWidth: 120, mb: 2 }}>
        <InputLabel>Tuần</InputLabel>
        <Select
          value={selectedWeek}
          label="Tuần"
          onChange={(e) => setSelectedWeek(e.target.value as number)}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {renderActionButton()}

      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Lớp</TableCell>
            <TableCell align="center">Chuyên cần</TableCell>
            <TableCell align="center">Vệ sinh</TableCell>
            <TableCell align="center">Xếp hàng</TableCell>
            <TableCell align="center">Vi phạm</TableCell>
            <TableCell align="center">Học tập</TableCell>
            <TableCell align="center">Thưởng</TableCell>
            <TableCell align="center">Tổng</TableCell>
            <TableCell align="center">Hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((row) => (
            <TableRow key={row.className}>
              <TableCell>{row.className}</TableCell>
              <TableCell align="center">{row.attendanceScore}</TableCell>
              <TableCell align="center">{row.hygieneScore}</TableCell>
              <TableCell align="center">{row.lineUpScore}</TableCell>
              <TableCell align="center">{row.violationScore}</TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  value={row.academicScore}
                  onChange={(e) =>
                    handleScoreChange(
                      row.className,
                      "academicScore",
                      Number(e.target.value)
                    )
                  }
                />
              </TableCell>
              <TableCell align="center">
                <TextField
                  type="number"
                  value={row.bonusScore}
                  onChange={(e) =>
                    handleScoreChange(
                      row.className,
                      "bonusScore",
                      Number(e.target.value)
                    )
                  }
                />
              </TableCell>
              <TableCell align="center">{row.totalScore}</TableCell>
              <TableCell align="center">{row.ranking}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default WeeklyScoresPage;
