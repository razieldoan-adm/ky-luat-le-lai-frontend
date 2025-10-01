import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TextField,
} from "@mui/material";
import api from "../../api/api";

interface WeeklyScoreRow {
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
  totalDiscipline: number;
  totalScore: number;
  ranking: number;
}

export default function WeeklyScoresPage() {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
  const [isTempLoaded, setIsTempLoaded] = useState(false);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [localEdited, setLocalEdited] = useState(false);
  const [externalChangeAvailable, setExternalChangeAvailable] = useState(false);

  useEffect(() => {
    fetchWeeksWithData();
    fetchSettings();
    fetchClasses();
  }, []);

  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get<number[]>("/api/class-weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Load weeks error:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/api/settings");
      const data = res.data;
      if (data) {
        if (Array.isArray(data) && data.length > 0) {
          setDisciplineMax(Number(data[0].disciplineMax ?? 100));
        } else if (typeof data === "object") {
          setDisciplineMax(Number((data as any).disciplineMax ?? 100));
        }
      }
    } catch (err) {
      console.error("Load settings error:", err);
      setDisciplineMax(100);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes/with-teacher");
      setClassOptions(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  const fetchScores = async (weekNumber: number, isTemp = false) => {
    setLoading(true);
    try {
      let res;
      if (!isTemp && weeksWithData.includes(weekNumber)) {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores?weekNumber=${weekNumber}`
        );
        let data = res.data || [];
        // chỉ lấy lớp có trong classOptions
        const validClassNames = classOptions.map((c) => c.name);
        data = data.filter((r) => validClassNames.includes(r.className));
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setIsTempLoaded(false);
        setLocalEdited(false);
        checkExternalChange(weekNumber);
      } else {
        res = await api.get<WeeklyScoreRow[]>("/api/class-weekly-scores/temp", {
          params: { weekNumber },
        });
        let data = res.data || [];
        const validClassNames = classOptions.map((c) => c.name);
        data = data.filter((r) => validClassNames.includes(r.className));
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setIsTempLoaded(true);
        setLocalEdited(false);
        setExternalChangeAvailable(false);
      }
    } catch (err) {
      console.error("Load scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkExternalChange = async (weekNumber: number) => {
    try {
      const res = await api.get<{ changed: boolean }>(
        `/api/class-weekly-scores/check-changes/${weekNumber}`
      );
      setExternalChangeAvailable(Boolean(res.data?.changed));
    } catch (err) {
      console.error("check-changes error:", err);
      setExternalChangeAvailable(false);
    }
  };

  const recalcAndRank = (list: WeeklyScoreRow[]) => {
    const arr = list.map((r) => ({ ...r }));

    arr.forEach((row) => {
      const attendance = Number(row.attendanceScore ?? 0);
      const hygiene = Number(row.hygieneScore ?? 0);
      const lineup = Number(row.lineUpScore ?? 0);
      const violation = Number(row.violationScore ?? 0);
      const bonus = Number(row.bonusScore ?? 0);
      const academic = Number(row.academicScore ?? 0);

      const totalViolation = violation + lineup + hygiene + attendance * 5;
      const totalDiscipline = Number(disciplineMax) - totalViolation;

      row.totalViolation = totalViolation;
      row.totalDiscipline = totalDiscipline;
      row.totalScore = totalDiscipline + bonus + academic;
    });

    // xếp hạng theo từng khối
    const byGrade: Record<string, WeeklyScoreRow[]> = {};
    arr.forEach((r) => {
      const g = String(r.grade ?? "Khác");
      if (!byGrade[g]) byGrade[g] = [];
      byGrade[g].push(r);
    });

    Object.values(byGrade).forEach((group) => {
      const sorted = [...group].sort(
        (a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0)
      );
      let prevScore: number | null = null;
      let prevRank = 0;
      let count = 0;
      sorted.forEach((row) => {
        count++;
        const sc = Number(row.totalScore ?? 0);
        if (prevScore === null) {
          prevScore = sc;
          prevRank = 1;
          row.ranking = 1;
        } else {
          if (sc === prevScore) {
            row.ranking = prevRank;
          } else {
            row.ranking = count;
            prevRank = count;
            prevScore = sc;
          }
        }
      });
      sorted.forEach((rSorted) => {
        const original = arr.find(
          (x) =>
            x.className === rSorted.className &&
            String(x.grade) === String(rSorted.grade)
        );
        if (original) original.ranking = rSorted.ranking;
      });
    });

    return arr;
  };

  const handleScoreChange = (
    index: number,
    field: "bonusScore" | "academicScore",
    value: number
  ) => {
    const updated = [...scores];
    if (index < 0 || index >= updated.length) return;
    updated[index] = { ...updated[index], [field]: value };
    const recalced = recalcAndRank(updated);
    setScores(recalced);
    setLocalEdited(true);
    setExternalChangeAvailable(false);
  };

  const handleUpdate = async () => {
    if (!week) return;
    try {
      if (localEdited) {
        await api.post("/api/class-weekly-scores/save", {
          weekNumber: week,
          scores,
        });
        setLocalEdited(false);
        alert("Đã lưu chỉnh sửa và cập nhật xong!");
        fetchWeeksWithData();
        checkExternalChange(Number(week));
      } else if (externalChangeAvailable) {
        const res = await api.post<WeeklyScoreRow[]>(
          `/api/class-weekly-scores/update/${week}`
        );
        let data = res.data || [];
        const validClassNames = classOptions.map((c) => c.name);
        data = data.filter((r) => validClassNames.includes(r.className));
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setExternalChangeAvailable(false);
        alert("Đã cập nhật dữ liệu tuần từ các bảng gốc!");
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const renderTableByGrade = (grade: string, rows: WeeklyScoreRow[]) => {
    const displayRows = [...rows].sort((a, b) =>
      a.className.localeCompare(b.className)
    );
    if (displayRows.length === 0) return null;

    return (
      <Box key={grade} mt={3}>
        <Typography variant="h6" gutterBottom>
          Khối {grade}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                <TableCell>Chuyên cần</TableCell>
                <TableCell>Vệ sinh</TableCell>
                <TableCell>Xếp hàng</TableCell>
                <TableCell>Vi phạm</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Tổng nề nếp</TableCell>
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

                let bg = "transparent";
                if (row.ranking === 1) bg = "#fff9c4"; // vàng nhạt
                else if (row.ranking === 2) bg = "#e0e0e0"; // bạc
                else if (row.ranking === 3) bg = "#ffe0b2"; // đồng

                return (
                  <TableRow key={row.className} sx={{ backgroundColor: bg }}>
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
                    <TableCell>{row.totalDiscipline}</TableCell>
                    <TableCell>{row.totalScore}</TableCell>
                    <TableCell>{row.ranking}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const groupedScores: { [grade: string]: WeeklyScoreRow[] } = {};
  scores.forEach((s) => {
    const g = String(s.grade ?? "Khác");
    if (!groupedScores[g]) groupedScores[g] = [];
    groupedScores[g].push(s);
  });

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          value={week}
          onChange={(e) => setWeek(e.target.value as number)}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {[...Array(20).keys()].map((i) => {
            const w = i + 1;
            const hasData = weeksWithData.includes(w);
            return (
              <MenuItem
                key={w}
                value={w}
                sx={hasData ? { color: "green" } : {}}
              >
                Tuần {w} {hasData ? "(Đã có dữ liệu)" : ""}
              </MenuItem>
            );
          })}
        </Select>

        {!weeksWithData.includes(Number(week)) && week !== "" && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => fetchScores(Number(week), true)}
          >
            Load dữ liệu
          </Button>
        )}

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleUpdate}
          disabled={!week || (!localEdited && !externalChangeAvailable)}
        >
          Cập nhật
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : scores.length > 0 ? (
        <>
          {["6", "7", "8", "9"].map((g) =>
            renderTableByGrade(g, groupedScores[g] || [])
          )}
        </>
      ) : (
        week !== "" && <Typography>Chưa có dữ liệu tuần này.</Typography>
      )}
    </Box>
  );
}
