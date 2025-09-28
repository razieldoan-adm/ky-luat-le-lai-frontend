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
      (updated.academicScore ?? 0) +
      (updated.bonusScore ?? 0) +
      (updated.attendanceScore ?? 0) +
      (updated.hygieneScore ?? 0) +
      (updated.lineUpScore ?? 0) -
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

  // Load dữ liệu tạm (chưa có trong DB)
  const handleLoadData = async () => {
    const res = await api.get(
      `/api/class-weekly-scores/temp?weekNumber=${selectedWeek}`
    );
    setScores(res.data);
    setIsRanked(false);
    setIsSaved(false);
    setHasChanges(true);
  };

  // Tính điểm + xếp hạng
  const handleRankScores = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    ranked.forEach((s, i) => (s.ranking = i + 1));
    setScores(ranked);
    setIsRanked(true);
    setIsSaved(false);
    setHasChanges(true);
  };

  // Cập nhật (tính lại rank từ dữ liệu đang có)
  const handleUpdateScores = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    ranked.forEach((s, i) => (s.ranking = i + 1));
    setScores(ranked);
    setIsRanked(true);
    setIsSaved(false);
    setHasChanges(true);
  };

  // Lưu dữ liệu vào DB
  const handleSaveScores = async () => {
    await api.post("/api/class-weekly-scores/save", {
      weekNumber: selectedWeek,
      scores,
    });
    setIsSaved(true);
    setHasChanges(false);
  };

  // render button theo flow
  const renderActionButton = () => {
    if (!scores.length) {
      return <Button onClick={handleLoadData}>Load dữ liệu</Button>;
    }
    if (hasChanges && !isRanked) {
      return <Button onClick={handleUpdateScores}>Cập nhật</Button>;
    }
    if (!isRanked) {
      return <Button onClick={handleRankScores}>Tính xếp hạng</Button>;
    }
    if (!isSaved) {
      return <Button onClick={handleSaveScores}>Lưu</Button>;
    }
    return <Button disabled>Đã lưu</Button>;
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
            <TableCell>Điểm chuyên cần</TableCell>
            <TableCell>Điểm vệ sinh</TableCell>
            <TableCell>Điểm xếp hàng</TableCell>
            <TableCell>Điểm vi phạm</TableCell>
            <TableCell>Điểm học tập</TableCell>
            <TableCell>Điểm thưởng</TableCell>
            <TableCell>Tổng điểm</TableCell>
            <TableCell>Xếp hạng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scores.map((row) => (
            <TableRow key={row.className}>
              <TableCell>{row.className}</TableCell>
              <TableCell>{row.attendanceScore}</TableCell>
              <TableCell>{row.hygieneScore}</TableCell>
              <TableCell>{row.lineUpScore}</TableCell>
              <TableCell>{row.violationScore}</TableCell>
              <TableCell>
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
              <TableCell>
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
              <TableCell>{row.totalScore}</TableCell>
              <TableCell>{row.ranking}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default WeeklyScoresPage;
