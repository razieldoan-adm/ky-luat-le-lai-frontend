import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getTempWeeklyScores, saveTempWeeklyScores } from "../../api/api";
import * as XLSX from "xlsx";

interface ScoreRow {
  className: string;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  bonusScore: number;
  studyScore: number;
  totalScore: number;
  rank: number;
}

const WeeklyScorePage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [hasData, setHasData] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changed, setChanged] = useState(false); // thêm để phát hiện thay đổi

  useEffect(() => {
    // tạo danh sách tuần từ 1 đến 40
    setWeeks(Array.from({ length: 40 }, (_, i) => i + 1));
  }, []);

  const handleLoadData = async () => {
    if (!selectedWeek) return;
    try {
      const res = await getTempWeeklyScores(selectedWeek as number);
      if (res && res.length > 0) {
        setScores(res);
        setHasData(true);
        setCalculated(res.some((s: ScoreRow) => s.rank > 0));
        setSaved(true);
        setChanged(false);
      } else {
        setScores([]);
        setHasData(false);
        setCalculated(false);
        setSaved(false);
        setChanged(false);
      }
    } catch (error) {
      console.error("Lỗi load dữ liệu:", error);
    }
  };

  const handleChange = (
    className: string,
    field: keyof ScoreRow,
    value: number
  ) => {
    setScores((prev) =>
      prev.map((s) =>
        s.className === className ? { ...s, [field]: value } : s
      )
    );
    setCalculated(false);
    setSaved(false);
    setChanged(true); // có thay đổi dữ liệu
  };

  const handleCalculate = () => {
    const updated = scores.map((s) => {
      const total =
        s.disciplineScore +
        s.hygieneScore +
        s.attendanceScore +
        s.bonusScore +
        s.studyScore;
      return { ...s, totalScore: total };
    });

    updated.sort((a, b) => b.totalScore - a.totalScore);
    updated.forEach((s, idx) => (s.rank = idx + 1));

    setScores(updated);
    setCalculated(true);
    setChanged(false);
    setSaved(false);
  };

  const handleUpdate = () => {
    handleCalculate(); // tính lại điểm & hạng
    setChanged(false);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await saveTempWeeklyScores(selectedWeek as number, scores);
      setSaved(true);
    } catch (error) {
      console.error("Lỗi lưu:", error);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(scores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeeklyScores");
    XLSX.writeFile(wb, `Week_${selectedWeek}_Scores.xlsx`);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua theo tuần
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value="">Chọn tuần</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>

        <Stack direction="row" spacing={2}>
          {!hasData && (
            <Button
              variant="contained"
              color="info"
              onClick={handleLoadData}
              disabled={!selectedWeek}
            >
              Load dữ liệu
            </Button>
          )}

          {hasData && !calculated && !changed && (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCalculate}
              disabled={!scores.length}
            >
              Tính xếp hạng
            </Button>
          )}

          {hasData && changed && (
            <Button
              variant="contained"
              color="warning"
              onClick={handleUpdate}
              disabled={!scores.length}
            >
              Cập nhật
            </Button>
          )}

          {hasData && calculated && !saved && !changed && (
            <Button
              variant="contained"
              color="success"
              onClick={handleSave}
              disabled={!scores.length}
            >
              Lưu
            </Button>
          )}

          {hasData && calculated && saved && !changed && (
            <Button variant="outlined" disabled>
              Đã lưu
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={handleExportExcel}
            disabled={!scores.length}
          >
            Xuất Excel
          </Button>
        </Stack>
      </Stack>

      {scores.length > 0 && (
        <Box>
          <table border={1} width="100%">
            <thead>
              <tr>
                <th>Lớp</th>
                <th>Kỷ luật</th>
                <th>Vệ sinh</th>
                <th>Chuyên cần</th>
                <th>Điểm thưởng</th>
                <th>Điểm học tập</th>
                <th>Tổng điểm</th>
                <th>Xếp hạng</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.className}</td>
                  <td>{s.disciplineScore}</td>
                  <td>{s.hygieneScore}</td>
                  <td>{s.attendanceScore}</td>
                  <td>
                    <TextField
                      type="number"
                      value={s.bonusScore}
                      onChange={(e) =>
                        handleChange(s.className, "bonusScore", Number(e.target.value))
                      }
                      size="small"
                    />
                  </td>
                  <td>
                    <TextField
                      type="number"
                      value={s.studyScore}
                      onChange={(e) =>
                        handleChange(s.className, "studyScore", Number(e.target.value))
                      }
                      size="small"
                    />
                  </td>
                  <td>{s.totalScore}</td>
                  <td>{s.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
};

export default WeeklyScorePage;
