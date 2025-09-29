import React, { useEffect, useState } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import api from "../../api/api";

interface Score {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<Score[]>([]);
  const [hasData, setHasData] = useState(false);
  const [needUpdate, setNeedUpdate] = useState(false);

  // lấy danh sách tuần có trong năm học
  useEffect(() => {
    api.get("/study-weeks").then((res) => {
      setWeeks(res.data.weeks || []);
    });
  }, []);

  // khi chọn tuần → kiểm tra DB có dữ liệu không
  useEffect(() => {
    if (!selectedWeek) return;

    api
      .get("/weekly-scores", { params: { weekNumber: selectedWeek } })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setScores(res.data);
          setHasData(true);
          // kiểm tra có cần cập nhật không
          api
            .get(`/weekly-scores/check-changes/${selectedWeek}`)
            .then((r) => setNeedUpdate(r.data.changed))
            .catch(() => setNeedUpdate(false));
        } else {
          setScores([]);
          setHasData(false);
          setNeedUpdate(false);
        }
      });
  }, [selectedWeek]);

  // load dữ liệu tạm
  const loadTemp = async () => {
    if (!selectedWeek) return;
    const res = await api.get("/weekly-scores/temp", {
      params: { weekNumber: selectedWeek },
    });
    setScores(res.data);
    setHasData(false);
    setNeedUpdate(false);
  };

  // tính xếp hạng trong khối
  const calculateRanking = () => {
    const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore: number | null = null;
    let count = 0;

    const ranked = sorted.map((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      return { ...s, ranking: currentRank };
    });

    setScores(ranked);
  };

  // lưu vào DB
  const saveScores = async () => {
    if (!selectedWeek) return;
    await api.post("/weekly-scores/save", {
      weekNumber: selectedWeek,
      scores,
    });
    setHasData(true);
    setNeedUpdate(false);
  };

  // cập nhật lại dữ liệu
  const updateScores = async () => {
    if (!selectedWeek) return;
    const res = await api.post(`/weekly-scores/update/${selectedWeek}`);
    setScores(res.data);
    setNeedUpdate(false);
    setHasData(true);
  };

  // xuất Excel
  const exportExcel = () => {
    console.log("Xuất Excel", scores);
    // TODO: gọi API export Excel backend hoặc export frontend
  };

  // chỉnh điểm học tập / thưởng
  const handleChange = (
    index: number,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    const updated = [...scores];
    updated[index][field] = value;
    updated[index].totalScore =
      updated[index].academicScore +
      updated[index].bonusScore +
      updated[index].totalViolation;
    setScores(updated);
  };

  return (
    <div>
      <h2>Điểm thi đua tuần</h2>

      {/* chọn tuần */}
      <Select
        value={selectedWeek}
        onChange={(e) => setSelectedWeek(Number(e.target.value))}
        displayEmpty
      >
        <MenuItem value="">-- Chọn tuần --</MenuItem>
        {weeks.map((w) => (
          <MenuItem key={w} value={w}>
            Tuần {w}
          </MenuItem>
        ))}
      </Select>

      {/* nút thao tác */}
      <div style={{ marginTop: 16 }}>
        {!hasData && scores.length === 0 && selectedWeek && (
          <Button onClick={loadTemp} variant="contained">
            Load dữ liệu
          </Button>
        )}

        {scores.length > 0 && (
          <>
            <Button
              onClick={calculateRanking}
              variant="outlined"
              style={{ marginRight: 8 }}
            >
              Tính xếp hạng
            </Button>

            {!hasData && (
              <Button
                onClick={saveScores}
                variant="contained"
                color="primary"
                style={{ marginRight: 8 }}
              >
                Lưu
              </Button>
            )}

            {hasData && needUpdate && (
              <Button
                onClick={updateScores}
                variant="contained"
                color="secondary"
                style={{ marginRight: 8 }}
              >
                Cập nhật
              </Button>
            )}

            <Button onClick={exportExcel} variant="outlined" color="success">
              Xuất Excel
            </Button>
          </>
        )}
      </div>

      {/* bảng điểm */}
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
            {scores.map((s, i) => (
              <TableRow key={s.className}>
                <TableCell>{s.className}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={s.academicScore}
                    onChange={(e) =>
                      handleChange(i, "academicScore", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={s.bonusScore}
                    onChange={(e) =>
                      handleChange(i, "bonusScore", Number(e.target.value))
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>{s.violationScore}</TableCell>
                <TableCell>{s.hygieneScore}</TableCell>
                <TableCell>{s.attendanceScore}</TableCell>
                <TableCell>{s.lineUpScore}</TableCell>
                <TableCell>{s.totalViolation}</TableCell>
                <TableCell>{s.totalScore}</TableCell>
                <TableCell>{s.ranking}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
