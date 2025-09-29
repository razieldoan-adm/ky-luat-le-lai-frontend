import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Button,
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface Week {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ScoreRow {
  className: string;
  studyScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineupScore: number;
  disciplineTotal: number;
  total: number;
  rank?: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [hasData, setHasData] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rawChanged, setRawChanged] = useState(false);

  // lấy danh sách tuần
  useEffect(() => {
    api.get("/api/study-weeks").then((res) => setWeeks(res.data));
  }, []);

  // load dữ liệu theo tuần
  const loadWeekData = async (weekNumber: number) => {
    try {
      const res = await api.get("/api/class-weekly-scores", {
        params: { weekNumber },
      });
      const existing: ScoreRow[] = res.data?.scores || [];

      setScores(existing);
      setHasData(existing.length > 0);
      setCalculated(existing.some((s) => s.rank !== undefined));
      setSaved(res.data?.saved || false);
      setRawChanged(res.data?.rawChanged || false);
    } catch (err) {
      console.error(err);
      setScores([]);
      setHasData(false);
      setCalculated(false);
      setSaved(false);
      setRawChanged(false);
    }
  };

  const handleWeekChange = (event: any) => {
    const week = weeks.find((w) => w.weekNumber === event.target.value) || null;
    setSelectedWeek(week);
    if (week) loadWeekData(week.weekNumber);
  };

  // chỉnh điểm học tập / thưởng → phải tính lại
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
  };

  // tính xếp hạng
  const calculateRanks = () => {
    const updated = scores.map((s) => ({
      ...s,
      disciplineTotal:
        s.violationScore + s.hygieneScore + s.attendanceScore + s.lineupScore,
      total:
        s.studyScore +
        s.bonusScore +
        s.violationScore +
        s.hygieneScore +
        s.attendanceScore +
        s.lineupScore,
    }));

    const ranked = [...updated].sort((a, b) => b.total - a.total);
    ranked.forEach((s, i) => {
      const idx = updated.findIndex((u) => u.className === s.className);
      updated[idx].rank = i + 1;
    });

    setScores(updated);
    setCalculated(true);
  };

  // lưu dữ liệu
  const saveScores = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/api/class-weekly-scores", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      setSaved(true);
      setRawChanged(false);
    } catch (err) {
      console.error(err);
    }
  };

  // xuất excel
  const exportExcel = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get(
        `/api/class-weekly-scores/export/${selectedWeek.weekNumber}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `weekly-scores-week-${selectedWeek.weekNumber}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Bảng điểm thi đua tuần</h2>
      <Select
        value={selectedWeek?.weekNumber || ""}
        onChange={handleWeekChange}
        displayEmpty
      >
        <MenuItem value="">Chọn tuần</MenuItem>
        {weeks.map((w) => (
          <MenuItem key={w.weekNumber} value={w.weekNumber}>
            Tuần {w.weekNumber} ({w.startDate} → {w.endDate})
          </MenuItem>
        ))}
      </Select>

      {selectedWeek && (
        <div style={{ marginTop: 16 }}>
          {!hasData && (
            <Button
              variant="contained"
              onClick={() => loadWeekData(selectedWeek.weekNumber)}
            >
              Load dữ liệu
            </Button>
          )}

          {hasData && !calculated && (
            <Button variant="contained" color="primary" onClick={calculateRanks}>
              Tính xếp hạng
            </Button>
          )}

          {calculated && !saved && (
            <Button variant="contained" color="success" onClick={saveScores}>
              Lưu
            </Button>
          )}

          {hasData && saved && rawChanged && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => loadWeekData(selectedWeek.weekNumber)}
            >
              Cập nhật
            </Button>
          )}

          {hasData && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={exportExcel}
              style={{ marginLeft: 8 }}
            >
              Xuất Excel
            </Button>
          )}
        </div>
      )}

      {scores.length > 0 && (
        <TableContainer component={Paper} style={{ marginTop: 16 }}>
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
              {scores.map((s) => (
                <TableRow key={s.className}>
                  <TableCell>{s.className}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={s.studyScore}
                      onChange={(e) =>
                        handleChange(s.className, "studyScore", +e.target.value)
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={s.bonusScore}
                      onChange={(e) =>
                        handleChange(s.className, "bonusScore", +e.target.value)
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{s.violationScore}</TableCell>
                  <TableCell>{s.hygieneScore}</TableCell>
                  <TableCell>{s.attendanceScore}</TableCell>
                  <TableCell>{s.lineupScore}</TableCell>
                  <TableCell>{s.disciplineTotal}</TableCell>
                  <TableCell>{s.total}</TableCell>
                  <TableCell>{s.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default WeeklyScoresPage;
