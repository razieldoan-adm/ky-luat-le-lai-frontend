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
  Alert,
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
  const [homeroomSet, setHomeroomSet] = useState<Set<string>>(new Set());
  const [localEdited, setLocalEdited] = useState(false);
  const [externalChangeAvailable, setExternalChangeAvailable] = useState(false);

  // helper: chuẩn hóa tên lớp để so sánh chính xác
  const normalizeClassName = (v: any) => String(v ?? "").trim().toUpperCase();

  useEffect(() => {
    fetchWeeksWithData();
    fetchSettings();
    fetchClassesWithGVCN(); // <-- Lấy danh sách lớp có GVCN
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchClassesWithGVCN = async () => {
    try {
      const res = await api.get<any[]>("/api/classes/with-teacher");
      const arr = res.data || [];
      const set = new Set<string>();
      arr.forEach((c) => {
        if (c?.name) {
          // chuẩn hóa trước khi add vào set
          set.add(normalizeClassName(c.name));
        }
      });
      setHomeroomSet(set); // <-- Lưu set các lớp có GVCN
    } catch (err) {
      console.error("Load classes error:", err);
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
        
        // **LOGIC LỌC LỚP CÓ GVCN - Phần 1: Dữ liệu đã lưu**
        if (homeroomSet.size > 0) {
          data = data.filter((r) =>
            homeroomSet.has(normalizeClassName(r.className))
          );
        }
        
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
        
        // **LOGIC LỌC LỚP CÓ GVCN - Phần 2: Dữ liệu tạm thời**
        if (homeroomSet.size > 0) {
          data = data.filter((r) =>
            homeroomSet.has(normalizeClassName(r.className))
          );
        }
        
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
            normalizeClassName(x.className) === normalizeClassName(rSorted.className) &&
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
    // Đảm bảo giá trị nhập vào là số không âm
    const numericValue = Math.max(0, Number(value));
    
    const updated = [...scores];
    if (index < 0 || index >= updated.length) return;
    updated[index] = { ...updated[index], [field]: numericValue };
    const recalced = recalcAndRank(updated);
    setScores(recalced);
    setLocalEdited(true);
    setExternalChangeAvailable(false);
  };

  const handleSave = async () => {
    if (!week || scores.length === 0) return;
    setLoading(true);
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: week,
        scores,
      });
      alert("Đã lưu dữ liệu tuần thành công!");
      setIsTempLoaded(false);
      setLocalEdited(false);
      fetchWeeksWithData();
      checkExternalChange(Number(week));
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu.");
    } finally {
        setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!week) return;
    setLoading(true);
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
        
        // **LOGIC LỌC LỚP CÓ GVCN - Phần 3: Dữ liệu Cập nhật**
        if (homeroomSet.size > 0) {
          data = data.filter((r) =>
            homeroomSet.has(normalizeClassName(r.className))
          );
        }
        
        const recalced = recalcAndRank(data);
        setScores(recalced);
        setExternalChangeAvailable(false);
        alert("Đã cập nhật dữ liệu tuần từ các bảng gốc!");
      } else {
        alert("Không có thay đổi để cập nhật.");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Lỗi khi cập nhật dữ liệu.");
    } finally {
        setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!week) return;
    try {
      const res = await api.get(`/api/class-weekly-scores/export/${week}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly_scores_${week}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export error:", err);
      alert("Lỗi khi xuất Excel.");
    }
  };

  const handleDelete = async () => {
    if (!week) return;
    if (!window.confirm(`Bạn có chắc muốn xoá dữ liệu tuần ${week}?`)) return;
    try {
      await api.delete(`/api/class-weekly-scores/${week}`);
      alert("Đã xoá dữ liệu tuần!");
      setScores([]);
      fetchWeeksWithData();
      setIsTempLoaded(false);
      setLocalEdited(false);
      setExternalChangeAvailable(false);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Lỗi khi xoá dữ liệu.");
    }
  };

  useEffect(() => {
    if (week === "") {
      setScores([]);
      setIsTempLoaded(false);
      setLocalEdited(false);
      setExternalChangeAvailable(false);
      return;
    }
    if (weeksWithData.includes(Number(week))) {
      fetchScores(Number(week), false);
    } else {
      // Nếu tuần chưa có dữ liệu, ta chỉ clear bảng điểm để người dùng chọn "Load dữ liệu"
      setScores([]);
      setIsTempLoaded(false);
      setLocalEdited(false);
      setExternalChangeAvailable(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, weeksWithData, homeroomSet, disciplineMax]); // Thêm homeroomSet để re-fetch khi có ds lớp GVCN

  const renderTableByGrade = (grade: string, rows: WeeklyScoreRow[]) => {
    // Sắp xếp theo tên lớp trước khi render
    const displayRows = [...rows].sort((a, b) =>
      a.className.localeCompare(b.className)
    );
    if (displayRows.length === 0) return null;

    return (
      <Box key={grade} mt={3}>
        <Typography variant="h6" gutterBottom>
          Khối {grade} (Điểm tối đa nề nếp: {disciplineMax})
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                <TableCell>Lớp</TableCell>
                <TableCell align="center">Chuyên cần</TableCell>
                <TableCell align="center">Vệ sinh</TableCell>
                <TableCell align="center">Xếp hàng</TableCell>
                <TableCell align="center">Vi phạm</TableCell>
                <TableCell sx={{ color: 'blue', fontWeight: 'bold' }}>Học tập</TableCell>
                <TableCell sx={{ color: 'green', fontWeight: 'bold' }}>Thưởng</TableCell>
                <TableCell align="center">Tổng nề nếp</TableCell>
                <TableCell align="center">Tổng điểm</TableCell>
                <TableCell align="center">Hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((row) => {
                const idx = scores.findIndex(
                  (s) =>
                    normalizeClassName(s.className) === normalizeClassName(row.className) &&
                    String(s.grade) === String(row.grade)
                );

                // tô màu top 1-2-3 (theo từng khối)
                let bg = "transparent";
                if (row.ranking === 1) bg = "#fff9c4"; // vàng nhạt
                else if (row.ranking === 2) bg = "#e0e0e0"; // bạc
                else if (row.ranking === 3) bg = "#ffe0b2"; // đồng

                return (
                  <TableRow key={row.className} sx={{ backgroundColor: bg }} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{row.className}</TableCell>
                    <TableCell align="center">{row.attendanceScore}</TableCell>
                    <TableCell align="center">{row.hygieneScore}</TableCell>
                    <TableCell align="center">{row.lineUpScore}</TableCell>
                    <TableCell align="center">{row.violationScore}</TableCell>
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
                        variant="outlined"
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
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{row.totalDiscipline}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{row.totalScore}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>#{row.ranking}</TableCell>
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

  const isSaveDisabled = loading || (!isTempLoaded && !localEdited);
  const isUpdateDisabled = loading || !week || (!localEdited && !externalChangeAvailable);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Quản lý Điểm thi đua Tuần
      </Typography>

      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={4}>
        <Typography fontWeight="bold">Chọn tuần:</Typography>
        <Select
          value={week}
          onChange={(e) => setWeek(e.target.value as number)}
          displayEmpty
          sx={{ minWidth: 160 }}
          size="small"
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {[...Array(20).keys()].map((i) => {
            const w = i + 1;
            const hasData = weeksWithData.includes(w);
            return (
              <MenuItem key={w} value={w} sx={hasData ? { color: "green", fontWeight: 'bold' } : {}}>
                Tuần {w} {hasData ? "✅ (Đã lưu)" : ""}
              </MenuItem>
            );
          })}
        </Select>

        {!weeksWithData.includes(Number(week)) && week !== "" && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => fetchScores(Number(week), true)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "📥 Load dữ liệu"}
          </Button>
        )}

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          {loading && !isUpdateDisabled ? <CircularProgress size={24} /> : "💾 Lưu"}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={handleUpdate}
          disabled={isUpdateDisabled}
        >
          {externalChangeAvailable ? "♻️ Cập nhật & Lưu" : "⬆️ Cập nhật"}
        </Button>

        <Button variant="outlined" onClick={handleExport} disabled={!week}>
          ⬇️ Xuất Excel
        </Button>

        {weeksWithData.includes(Number(week)) && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              disabled={!week}
            >
              ❌ Xoá tuần
            </Button>
        )}
      </Box>
      
      {localEdited && (
        <Alert severity="warning" sx={{ mb: 2 }}>
            Bạn đã chỉnh sửa cục bộ. Hãy **Lưu** để áp dụng thay đổi!
        </Alert>
      )}
      {externalChangeAvailable && (
        <Alert severity="info" sx={{ mb: 2 }}>
            Dữ liệu nề nếp có thay đổi ngoài hệ thống. Hãy **Cập nhật** để làm mới.
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
            <CircularProgress />
        </Box>
      ) : scores.length > 0 ? (
        <>
          {/* Lọc và hiển thị theo khối */}
          {["6", "7", "8", "9"].map((g) =>
            renderTableByGrade(g, groupedScores[g] || [])
          )}
        </>
      ) : (
        week !== "" && <Alert severity="info" sx={{ mt: 2 }}>Chưa có dữ liệu thi đua cho tuần **{week}**.</Alert>
      )}
    </Box>
  );
}
