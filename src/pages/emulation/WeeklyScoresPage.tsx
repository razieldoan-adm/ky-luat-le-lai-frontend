import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  MenuItem,
  Select,
  Typography,
  Grid,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScore {
  className: string;
  grade: number;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalViolation: number;
  totalScore: number;
  ranking: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [localEdited, setLocalEdited] = useState(false);
  const [externalChangeAvailable, setExternalChangeAvailable] = useState(false);

  // load tuần đã có dữ liệu
  useEffect(() => {
    api.get("/class-weekly-scores/weeks").then((res) => {
      setWeeksWithData(res.data);
    });
    api.get("/settings").then((res) => {
      setDisciplineMax(res.data?.disciplineMax ?? 100);
    });
  }, []);

  // load dữ liệu tuần khi chọn
  useEffect(() => {
    if (!week) return;

    api
      .get(`/class-weekly-scores?weekNumber=${week}`)
      .then((res) => {
        if (res.data.length > 0) {
          setScores(res.data);
        } else {
          setScores([]);
        }
        setLocalEdited(false);
      })
      .catch((err) => console.error(err));

    // kiểm tra thay đổi từ backend
    api
      .get(`/class-weekly-scores/check-changes/${week}`)
      .then((res) => setExternalChangeAvailable(res.data.hasChanges))
      .catch(() => setExternalChangeAvailable(false));
  }, [week]);

  const handleLoadData = () => {
    if (!week) return;
    api
      .get(`/class-weekly-scores/temp?weekNumber=${week}`)
      .then((res) => {
        setScores(res.data);
        setLocalEdited(true);
      })
      .catch((err) => console.error(err));
  };

  const handleSave = () => {
    if (!week) return;
    api
      .post("/class-weekly-scores/save", { weekNumber: week, scores })
      .then(() => {
        setLocalEdited(false);
        setExternalChangeAvailable(false);
        if (!weeksWithData.includes(Number(week))) {
          setWeeksWithData([...weeksWithData, Number(week)]);
        }
      })
      .catch((err) => console.error(err));
  };

  const handleUpdate = () => {
    if (!week) return;
    api
      .post(`/class-weekly-scores/update/${week}`, { scores })
      .then(() => {
        setLocalEdited(false);
        setExternalChangeAvailable(false);
      })
      .catch((err) => console.error(err));
  };

  // xử lý nhập học tập + thưởng
  const handleScoreChange = (
    index: number,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    const updatedScores = [...scores];
    updatedScores[index][field] = value;

    // tính lại tổng điểm
    updatedScores[index].totalScore =
      updatedScores[index].totalViolation +
      updatedScores[index].bonusScore -
      updatedScores[index].academicScore;

    // tính lại xếp hạng trong cùng khối
    const grade = updatedScores[index].grade;
    const sameGrade = updatedScores
      .filter((s) => s.grade === grade)
      .sort((a, b) => b.totalScore - a.totalScore);
    sameGrade.forEach((s, i) => {
      s.ranking = i + 1;
    });

    setScores(updatedScores);
    setLocalEdited(true);
  };

  const renderTableByGrade = (grade: number) => {
    const displayRows = scores
      .filter((s) => s.grade === grade)
      .sort((a, b) => a.ranking - b.ranking);

    if (displayRows.length === 0) return null;

    return (
      <div key={grade} style={{ marginBottom: 30 }}>
        <Typography variant="h6" gutterBottom>
          Khối {grade}
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Kỷ luật</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Điểm kỷ luật</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((row) => {
                const idx = scores.findIndex(
                  (s) =>
                    s.className === row.className &&
                    String(s.grade) === String(row.grade)
                );

                // tô màu top 1-2-3
                let bg = "transparent";
                if (row.ranking === 1) bg = "#fff9c4"; // vàng nhạt
                else if (row.ranking === 2) bg = "#e0e0e0"; // bạc
                else if (row.ranking === 3) bg = "#ffe0b2"; // đồng

                return (
                  <TableRow
                    key={row.className}
                    sx={{ backgroundColor: bg }}
                  >
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.attendanceScore}</TableCell>
                    <TableCell>{row.hygieneScore}</TableCell>
                    <TableCell>{row.lineUpScore}</TableCell>
                    <TableCell>{row.violationScore}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.academicScore ?? 0}
                        onChange={(e) =>
                          handleScoreChange(
                            idx,
                            "academicScore",
                            Number(e.target.value)
                          )
                        }
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.bonusScore ?? 0}
                        onChange={(e) =>
                          handleScoreChange(
                            idx,
                            "bonusScore",
                            Number(e.target.value)
                          )
                        }
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell>{row.totalViolation}</TableCell>
                    <TableCell>{row.totalScore}</TableCell>
                    <TableCell>{row.ranking}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item>
          <Select
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            displayEmpty
          >
            <MenuItem value="">Chọn tuần</MenuItem>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
              <MenuItem
                key={w}
                value={w}
                disabled={weeksWithData.includes(w)}
              >
                Tuần {w}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            onClick={handleLoadData}
            disabled={!week || weeksWithData.includes(Number(week))}
          >
            Load dữ liệu
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="success"
            onClick={handleSave}
            disabled={!week || scores.length === 0 || !localEdited}
          >
            Lưu dữ liệu
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleUpdate}
            disabled={!week || (!localEdited && !externalChangeAvailable)}
          >
            Cập nhật
          </Button>
        </Grid>
      </Grid>

      {renderTableByGrade(6)}
      {renderTableByGrade(7)}
      {renderTableByGrade(8)}
      {renderTableByGrade(9)}
    </div>
  );
};

export default WeeklyScoresPage;
