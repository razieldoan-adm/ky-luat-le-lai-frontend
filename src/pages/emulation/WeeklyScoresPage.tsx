import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
} from "@mui/material";
import axios from "axios";

interface ScoreRow {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineupScore: number;
  totalViolation?: number;
  totalScore?: number;
  rank?: number;
}

interface WeekOption {
  weekNumber: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [hasData, setHasData] = useState<boolean>(false);
  const [changesDetected, setChangesDetected] = useState<boolean>(false);

  // lấy ds tuần + setting
  useEffect(() => {
    const fetchWeeksAndSettings = async () => {
      try {
        const resWeeks = await axios.get("/api/weeks");
        setWeeks(resWeeks.data);

        const resSettings = await axios.get("/api/settings");
        setDisciplineMax(resSettings.data?.disciplineMax ?? 100);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWeeksAndSettings();
  }, []);

  // kiểm tra có dữ liệu DB không
  useEffect(() => {
    if (selectedWeek) {
      checkHasData(selectedWeek.weekNumber);
    }
  }, [selectedWeek]);

  const checkHasData = async (weekNumber: number) => {
    try {
      const res = await axios.get(`/api/class-weekly-scores?weekNumber=${weekNumber}`);
      if (res.data && res.data.length > 0) {
        setScores(res.data);
        setHasData(true);
        await checkChanges(weekNumber);
      } else {
        setScores([]);
        setHasData(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkChanges = async (weekNumber: number) => {
    try {
      const res = await axios.get(`/api/class-weekly-scores/check-changes/${weekNumber}`);
      setChangesDetected(res.data?.hasChanges || false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadData = async () => {
    if (!selectedWeek) return;
    try {
      const res = await axios.get("/api/class-weekly-scores/temp", {
        params: { weekNumber: selectedWeek.weekNumber },
      });
      setScores(res.data);
      setHasData(false);
      setChangesDetected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedWeek) return;
    try {
      const res = await axios.post(
        `/api/class-weekly-scores/update/${selectedWeek.weekNumber}`
      );
      setScores(res.data);
      setChangesDetected(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculate = () => {
    if (!scores.length) return;
    let updated = scores.map((s) => {
      const totalViolation =
        disciplineMax -
        (s.violationScore + s.hygieneScore + s.attendanceScore * 5 + s.lineupScore);
      const totalScore = s.academicScore + s.bonusScore + totalViolation;
      return { ...s, totalViolation, totalScore };
    });

    // nhóm theo khối để xếp hạng
    const grouped: Record<string, ScoreRow[]> = {};
    updated.forEach((r) => {
      if (!grouped[r.grade]) grouped[r.grade] = [];
      grouped[r.grade].push(r);
    });

    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => b.totalScore! - a.totalScore!);
      let prev: number | null = null,
        prevRank = 0;
      arr.forEach((row, i) => {
        if (prev === null) {
          row.rank = 1;
          prev = row.totalScore!;
          prevRank = 1;
        } else if (row.totalScore === prev) {
          row.rank = prevRank;
        } else {
          row.rank = i + 1;
          prev = row.totalScore!;
          prevRank = row.rank;
        }
      });
    });

    setScores(updated);
    setChangesDetected(true); // 🔥 bật nút lưu/cập nhật
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await axios.post("/api/class-weekly-scores/save", {
        weekNumber: selectedWeek.weekNumber,
        scores,
      });
      await checkHasData(selectedWeek.weekNumber);
      setChangesDetected(false); // ✅ reset sau khi lưu
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">Điểm thi đua tuần</Typography>

        {/* chọn tuần */}
        <Select
          value={selectedWeek?.weekNumber || ""}
          onChange={(e) => {
            const w = weeks.find((wk) => wk.weekNumber === e.target.value);
            setSelectedWeek(w || null);
          }}
          displayEmpty
        >
          <MenuItem value="">Chọn tuần</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </Select>

        <div style={{ marginTop: 16 }}>
          {!hasData && (
            <Button variant="contained" onClick={handleLoadData}>
              Load dữ liệu
            </Button>
          )}
          {hasData && (
            <Button
              variant="contained"
              onClick={handleUpdate}
              disabled={!changesDetected}
            >
              Cập nhật
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={handleCalculate}
            disabled={!scores.length}
            style={{ marginLeft: 8 }}
          >
            Tính xếp hạng
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!changesDetected}
            style={{ marginLeft: 8 }}
          >
            Lưu
          </Button>
        </div>

        {/* bảng dữ liệu */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              <TableCell>Khối</TableCell>
              <TableCell>Học tập</TableCell>
              <TableCell>Thưởng</TableCell>
              <TableCell>Kỷ luật</TableCell>
              <TableCell>Vệ sinh</TableCell>
              <TableCell>Chuyên cần</TableCell>
              <TableCell>Nghiêm túc</TableCell>
              <TableCell>Tổng kỷ luật</TableCell>
              <TableCell>Tổng điểm</TableCell>
              <TableCell>Xếp hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.grade}</TableCell>
                <TableCell>{row.academicScore}</TableCell>
                <TableCell>{row.bonusScore}</TableCell>
                <TableCell>{row.violationScore}</TableCell>
                <TableCell>{row.hygieneScore}</TableCell>
                <TableCell>{row.attendanceScore}</TableCell>
                <TableCell>{row.lineupScore}</TableCell>
                <TableCell>{row.totalViolation ?? ""}</TableCell>
                <TableCell>{row.totalScore ?? ""}</TableCell>
                <TableCell>{row.rank ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WeeklyScoresPage;
