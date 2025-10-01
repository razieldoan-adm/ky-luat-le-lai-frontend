// src/pages/emulation/WeeklyScoresPage.tsx
import React, { useEffect, useState } from "react";
import {
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface ClassScore {
  className: string;
  grade: number;
  chuyenCan: number;
  hygiene: number;
  ranking: number;
  violation: number;
  study: number;
  bonus: number;
  totalDiscipline: number;
  totalScore: number;
  rank: number;
}

interface Settings {
  disciplineMax: number;
  validClasses: string[]; // danh sách lớp có GVCN
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [weeklyScores, setWeeklyScores] = useState<ClassScore[]>([]);
  const [originalScores, setOriginalScores] = useState<ClassScore[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    api.get("/weekly-scores/weeks").then((res) => {
      setWeeks(res.data || []);
    });
  }, []);

  // lấy setting
  useEffect(() => {
    api.get("/settings").then((res) => {
      const cfg = res.data;
      setSettings({
        disciplineMax: cfg.disciplineMax ?? 100,
        validClasses: cfg.classes?.map((c: any) => c.name) || [],
      });
    });
  }, []);

  // load dữ liệu tuần
  const loadWeekData = async (week: number) => {
    try {
      let res = await api.get(`/weekly-scores?weekNumber=${week}`);
      let data: ClassScore[] = res.data;

      // nếu chưa có dữ liệu → load tạm
      if (!data || data.length === 0) {
        res = await api.get(`/weekly-scores/temp?weekNumber=${week}`);
        data = res.data;
      }

      // lọc lớp theo setting
      if (settings) {
        data = data.filter((row) =>
          settings.validClasses.includes(row.className)
        );
      }

      const calculated = recalcScores(data);
      setWeeklyScores(calculated);
      setOriginalScores(calculated);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
    }
  };

  // công thức tính điểm + xếp hạng
  const recalcScores = (data: ClassScore[]) => {
    if (!settings) return data;

    const disciplineMax = settings.disciplineMax;
    const grouped: { [grade: number]: ClassScore[] } = {};

    data.forEach((row) => {
      const totalDiscipline =
        disciplineMax -
        (row.violation + row.ranking + row.hygiene + row.chuyenCan * 5);

      const totalScore = totalDiscipline + row.bonus - row.study;

      const updated: ClassScore = {
        ...row,
        totalDiscipline,
        totalScore,
      };

      if (!grouped[row.grade]) grouped[row.grade] = [];
      grouped[row.grade].push(updated);
    });

    // xếp hạng theo khối
    Object.keys(grouped).forEach((g) => {
      grouped[+g]
        .sort((a, b) => b.totalScore - a.totalScore)
        .forEach((row, idx) => {
          row.rank = idx + 1;
        });
    });

    return Object.values(grouped).flat();
  };

  // xử lý thay đổi điểm học tập + thưởng
  const handleChange = (
    className: string,
    field: "study" | "bonus",
    value: number
  ) => {
    const updated = weeklyScores.map((row) =>
      row.className === className ? { ...row, [field]: value } : row
    );
    const recalculated = recalcScores(updated);
    setWeeklyScores(recalculated);

    // so sánh với dữ liệu gốc để bật nút Cập nhật
    setHasChanges(JSON.stringify(recalculated) !== JSON.stringify(originalScores));
  };

  // lưu cập nhật
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    await api.post(`/weekly-scores/update/${selectedWeek}`, weeklyScores);
    setOriginalScores(weeklyScores);
    setHasChanges(false);
    alert("Cập nhật thành công!");
  };

  // xuất excel
  const handleExport = async () => {
    if (!selectedWeek) return;
    window.location.href = `/api/weekly-scores/export/${selectedWeek}`;
  };

  // xóa tuần
  const handleDelete = async () => {
    if (!selectedWeek) return;
    if (window.confirm("Bạn có chắc muốn xóa dữ liệu tuần này?")) {
      await api.delete(`/weekly-scores/${selectedWeek}`);
      setWeeklyScores([]);
      setOriginalScores([]);
      setHasChanges(false);
      alert("Đã xoá dữ liệu tuần!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Select
        value={selectedWeek}
        onChange={(e) => {
          const week = e.target.value as number;
          setSelectedWeek(week);
          if (week) loadWeekData(week);
        }}
        displayEmpty
        style={{ marginBottom: 20 }}
      >
        <MenuItem value="">Chọn tuần</MenuItem>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
          <MenuItem key={w} value={w}>
            Tuần {w} {weeks.includes(w) ? "(Đã có dữ liệu)" : "(Chưa có dữ liệu)"}
          </MenuItem>
        ))}
      </Select>

      <div style={{ marginBottom: 20 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={!hasChanges}
          onClick={handleUpdate}
          style={{ marginRight: 10 }}
        >
          CẬP NHẬT
        </Button>
        <Button
          variant="outlined"
          onClick={handleExport}
          style={{ marginRight: 10 }}
        >
          XUẤT EXCEL
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={!selectedWeek}
        >
          XOÁ TUẦN
        </Button>
      </div>

      {/* render theo khối */}
      {[6, 7, 8, 9].map((grade) => {
        const rows = weeklyScores.filter((r) => r.grade === grade);
        if (rows.length === 0) return null;

        return (
          <div key={grade} style={{ marginBottom: 30 }}>
            <Typography variant="h6">Khối {grade}</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Lớp</TableCell>
                    <TableCell>Chuyên cần</TableCell>
                    <TableCell>Vệ sinh</TableCell>
                    <TableCell>Xếp hạng</TableCell>
                    <TableCell>Vi phạm</TableCell>
                    <TableCell>Học tập</TableCell>
                    <TableCell>Thưởng</TableCell>
                    <TableCell>Tổng nề nếp</TableCell>
                    <TableCell>Tổng điểm</TableCell>
                    <TableCell>Hạng</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.className}
                      style={{
                        backgroundColor:
                          row.rank === 1
                            ? "#fff59d"
                            : row.rank === 2
                            ? "#ffe082"
                            : row.rank === 3
                            ? "#ffcc80"
                            : "inherit",
                      }}
                    >
                      <TableCell>{row.className}</TableCell>
                      <TableCell>{row.chuyenCan}</TableCell>
                      <TableCell>{row.hygiene}</TableCell>
                      <TableCell>{row.ranking}</TableCell>
                      <TableCell>{row.violation}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.study}
                          onChange={(e) =>
                            handleChange(
                              row.className,
                              "study",
                              Number(e.target.value)
                            )
                          }
                          size="small"
                          style={{ width: 60 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={row.bonus}
                          onChange={(e) =>
                            handleChange(
                              row.className,
                              "bonus",
                              Number(e.target.value)
                            )
                          }
                          size="small"
                          style={{ width: 60 }}
                        />
                      </TableCell>
                      <TableCell>{row.totalDiscipline}</TableCell>
                      <TableCell>{row.totalScore}</TableCell>
                      <TableCell>{row.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        );
      })}
    </div>
  );
}
