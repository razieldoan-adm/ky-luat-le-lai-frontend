```tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScoreRow {
  className: string;
  attendanceScore: number;
  hygieneScore: number;
  lineUpScore: number;
  violationScore: number;
  academicScore: number;
  bonusScore: number;
  totalScore?: number;
  rank?: number;
}

interface ClassOption {
  className: string;
  teacherName: string;
}

export default function WeeklyScoresPage() {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [homeroomSet, setHomeroomSet] = useState<Set<string>>(new Set());
  const [allowedClassSet, setAllowedClassSet] = useState<Set<string>>(new Set());
  const [disciplineMax, setDisciplineMax] = useState<number>(100);

  // 📌 Chuẩn hoá tên lớp
  const normalizeClassName = (name: string) =>
    name.trim().toUpperCase().replace(/\s+/g, "");

  // 📌 Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/weekly-scores/weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // 📌 Lấy danh sách lớp có GVCN
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes/with-teacher");
        setClassOptions(res.data);

        const set = new Set<string>();
        res.data.forEach((c: any) => set.add(normalizeClassName(c.className)));
        setHomeroomSet(set);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // 📌 Lấy settings (có danh sách lớp + disciplineMax)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        const settings = res.data;

        if (settings?.allowedClasses) {
          const set = new Set<string>();
          settings.allowedClasses.forEach((c: string) =>
            set.add(normalizeClassName(c))
          );
          setAllowedClassSet(set);
        }

        if (settings?.disciplineMax) {
          setDisciplineMax(settings.disciplineMax);
        }
      } catch (err) {
        console.error("Lỗi khi lấy settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // 📌 Lấy dữ liệu điểm theo tuần
  useEffect(() => {
    if (!selectedWeek) return;
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/weekly-scores?week=${selectedWeek}`);
        let data: WeeklyScoreRow[] = res.data;

        // Lọc theo lớp có GVCN + lớp trong settings
        if (homeroomSet.size > 0 || allowedClassSet.size > 0) {
          data = data.filter((r) => {
            const className = normalizeClassName(r.className);
            const inHomeroom = homeroomSet.has(className);
            const inAllowed =
              allowedClassSet.size === 0 || allowedClassSet.has(className);
            return inHomeroom && inAllowed;
          });
        }

        // Tính totalScore = disciplineMax - (attendance*5 + hygiene + lineup + violation) + academic + bonus
        data = data.map((row) => {
          const total =
            disciplineMax -
            (row.attendanceScore * 5 +
              row.hygieneScore +
              row.lineUpScore +
              row.violationScore) +
            row.academicScore +
            row.bonusScore;
          return { ...row, totalScore: total };
        });

        // Xếp hạng
        data.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
        data.forEach((row, idx) => (row.rank = idx + 1));

        setScores(data);
      } catch (err) {
        console.error("Lỗi khi lấy điểm tuần:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [selectedWeek, homeroomSet, allowedClassSet, disciplineMax]);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      {/* Chọn tuần */}
      <Box mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value="">
            <em>Chọn tuần</em>
          </MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>STT</TableCell>
                <TableCell>Lớp</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Vi phạm</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((row, idx) => (
                <TableRow
                  key={idx}
                  style={{
                    backgroundColor:
                      row.rank === 1
                        ? "#ffd700" // vàng
                        : row.rank === 2
                        ? "#c0c0c0" // bạc
                        : row.rank === 3
                        ? "#cd7f32" // đồng
                        : "inherit",
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.attendanceScore}</TableCell>
                  <TableCell>{row.hygieneScore}</TableCell>
                  <TableCell>{row.lineUpScore}</TableCell>
                  <TableCell>{row.violationScore}</TableCell>
                  <TableCell>{row.academicScore}</TableCell>
                  <TableCell>{row.bonusScore}</TableCell>
                  <TableCell>{row.totalScore}</TableCell>
                  <TableCell>{row.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
```
