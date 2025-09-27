import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
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
import axios from "axios";

interface Score {
  className: string;
  grade: string;
  weekNumber: number;
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

export default function WeeklyScoresPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<Score[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loaded" | "ranked" | "saved" | "updated"
  >("idle");
  const [hasChanges, setHasChanges] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");

  // nhóm dữ liệu theo khối
  const groupedByGrade = scores.reduce<Record<string, Score[]>>((acc, s) => {
    if (!acc[s.grade]) acc[s.grade] = [];
    acc[s.grade].push(s);
    return acc;
  }, {});
  const gradeKeys = Object.keys(groupedByGrade);

  // tải dữ liệu khi chọn tuần
  useEffect(() => {
    if (!selectedWeek) return;

    axios
      .get(`/api/class-weekly-scores?weekNumber=${selectedWeek}`)
      .then((res) => {
        if (res.data.length > 0) {
          setScores(res.data);
          setStatus("loaded");

          // kiểm tra dữ liệu đã có xếp hạng chưa
          const hasRank = res.data.some((s: Score) => s.ranking > 0);
          if (hasRank) setStatus("saved");

          // check thay đổi
          axios
            .get(`/api/class-weekly-scores/check-changes/${selectedWeek}`)
            .then((r) => setHasChanges(r.data.changed));
        } else {
          setScores([]);
          setStatus("idle");
        }
      });
  }, [selectedWeek]);

  // load dữ liệu tạm
  const handleLoad = async () => {
    const res = await axios.get(
      `/api/class-weekly-scores/temp?weekNumber=${selectedWeek}`
    );
    setScores(res.data);
    setStatus("loaded");
  };

  // tính xếp hạng
  const handleRank = () => {
    const ranked = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 0;
    let lastScore = null;
    let count = 0;

    const withRank = ranked.map((s) => {
      count++;
      if (s.totalScore !== lastScore) {
        currentRank = count;
        lastScore = s.totalScore;
      }
      return { ...s, ranking: currentRank };
    });

    setScores(withRank);
    setStatus("ranked");
  };

  // lưu dữ liệu
  const handleSave = async () => {
    await axios.post(`/api/class-weekly-scores/save`, {
      weekNumber: selectedWeek,
      scores,
    });
    setStatus("saved");
    setHasChanges(false);
  };

  // cập nhật dữ liệu gốc
  const handleUpdate = async () => {
    const res = await axios.post(
      `/api/class-weekly-scores/update/${selectedWeek}`
    );
    setScores(res.data);
    setStatus("loaded");
    setHasChanges(false);
  };

  // thay đổi điểm học tập/thưởng
  const handleChange = (
    className: string,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    setScores((prev) =>
      prev.map((s) =>
        s.className === className ? { ...s, [field]: value } : s
      )
    );
    if (status === "saved") setStatus("loaded"); // nếu sửa sau khi đã lưu thì quay lại trạng thái loaded
  };

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm tuần
      </Typography>

      {/* chọn tuần */}
      <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
        <InputLabel>Tuần</InputLabel>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          label="Tuần"
        >
          {[...Array(20)].map((_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              Tuần {i + 1}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* filter khối */}
      <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
        <InputLabel>Khối</InputLabel>
        <Select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          {gradeKeys.map((g) => (
            <MenuItem key={g} value={g}>
              {g}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* button */}
      {status === "idle" && selectedWeek && (
        <Button variant="contained" onClick={handleLoad}>
          Load dữ liệu
        </Button>
      )}
      {status === "loaded" && (
        <Button variant="contained" onClick={handleRank}>
          Tính xếp hạng
        </Button>
      )}
      {status === "ranked" && (
        <Button variant="contained" color="success" onClick={handleSave}>
          Lưu
        </Button>
      )}
      {status === "saved" && (
        <Button variant="contained" color="inherit" disabled>
          Đã lưu
        </Button>
      )}
      {hasChanges && (
        <Button
          variant="contained"
          color="warning"
          sx={{ ml: 2 }}
          onClick={handleUpdate}
        >
          Cập nhật
        </Button>
      )}

      {/* bảng */}
      {gradeKeys
        .filter((g) => gradeFilter === "all" || gradeFilter === g)
        .map((grade) => (
          <Box key={grade} mt={2} component={Paper} p={2}>
            <Typography variant="h6" gutterBottom>
              Khối {grade}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Table size="small">
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
                  <TableCell>Tổng điểm</TableCell>
                  <TableCell>Hạng</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedByGrade[grade].map((row) => (
                  <TableRow key={row.className}>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.academicScore}
                        onChange={(e) =>
                          handleChange(
                            row.className,
                            "academicScore",
                            +e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.bonusScore}
                        onChange={(e) =>
                          handleChange(
                            row.className,
                            "bonusScore",
                            +e.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{row.violationScore}</TableCell>
                    <TableCell>{row.hygieneScore}</TableCell>
                    <TableCell>{row.attendanceScore}</TableCell>
                    <TableCell>{row.lineUpScore}</TableCell>
                    <TableCell>{row.totalViolation}</TableCell>
                    <TableCell>{row.totalScore}</TableCell>
                    <TableCell>{row.ranking}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ))}
    </Box>
  );
}
