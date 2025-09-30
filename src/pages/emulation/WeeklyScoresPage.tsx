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
  totalDiscipline?: number;
  totalScore?: number;
  ranking?: number;
}

interface SchoolClass {
  name: string;
  grade: string;
  teacher?: string;
}

const WeeklyScoresPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState<number | "">("");
  const [weeksWithData, setWeeksWithData] = useState<number[]>([]);
  const [scores, setScores] = useState<WeeklyScoreRow[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);

  // lấy danh sách tuần đã có dữ liệu
  const fetchWeeksWithData = async () => {
    try {
      const res = await api.get<number[]>("/api/class-weekly-scores/weeks");
      setWeeksWithData(res.data || []);
    } catch (err) {
      console.error("Load weeks error:", err);
    }
  };

  // lấy danh sách lớp có GVCN
  const fetchClasses = async () => {
    try {
      const res = await api.get<SchoolClass[]>("/api/classes");
      const filtered = res.data.filter((c) => c.teacher); // chỉ lớp có GVCN
      setClasses(filtered);
    } catch (err) {
      console.error("Load classes error:", err);
    }
  };

  // lấy setting disciplineMax
  const fetchSettings = async () => {
    try {
      const res = await api.get<{ disciplineMax: number }[]>("/api/settings");
      if (res.data && res.data.length > 0) {
        setDisciplineMax(res.data[0].disciplineMax || 100);
      }
    } catch (err) {
      console.error("Load settings error:", err);
    }
  };

  // load dữ liệu điểm
  const fetchScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      let res;
      if (weeksWithData.includes(weekNumber)) {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores?weekNumber=${weekNumber}`
        );
      } else {
        res = await api.get<WeeklyScoreRow[]>(
          `/api/class-weekly-scores/temp?weekNumber=${weekNumber}`
        );
      }
      const data = recalcScores(res.data || []);
      setScores(data);
    } catch (err) {
      console.error("Load scores error:", err);
    } finally {
      setLoading(false);
    }
  };

  // tính lại tổng điểm & xếp hạng
  const recalcScores = (data: WeeklyScoreRow[]) => {
    const withTotal = data.map((s) => {
      const totalDiscipline =
        disciplineMax -
        (s.violationScore + s.lineUpScore + s.hygieneScore + s.attendanceScore * 5);
      const totalScore = totalDiscipline + (s.bonusScore || 0) + (s.academicScore || 0);
      return { ...s, totalDiscipline, totalScore };
    });

    // xếp hạng theo khối
    const grouped: Record<string, WeeklyScoreRow[]> = {};
    withTotal.forEach((s) => {
      if (!grouped[s.grade]) grouped[s.grade] = [];
      grouped[s.grade].push(s);
    });

    Object.keys(grouped).forEach((grade) => {
      grouped[grade]
        .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
        .forEach((s, idx) => {
          s.ranking = idx + 1;
        });
    });

    return withTotal;
  };

  // nhập điểm trực tiếp
  const handleScoreChange = (
    className: string,
    field: "academicScore" | "bonusScore",
    value: number
  ) => {
    const updated = scores.map((s) =>
      s.className === className ? { ...s, [field]: value } : s
    );
    setScores(recalcScores(updated));
  };

  // lưu dữ liệu tuần
  const handleSave = async () => {
    if (!week || scores.length === 0) return;
    try {
      await api.post("/api/class-weekly-scores/save", {
        weekNumber: week,
        scores,
      });
      alert("Đã lưu dữ liệu tuần!");
      fetchWeeksWithData();
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu.");
    }
  };

  // cập nhật lại dữ liệu tuần
  const handleUpdate = async () => {
    if (!week) return;
    try {
      const res = await api.post<WeeklyScoreRow[]>(
        `/api/class-weekly-scores/update/${week}`
      );
      setScores(recalcScores(res.data || []));
      alert("Đã cập nhật dữ liệu tuần!");
    } catch (err) {
      console.error("Update error:", err);
      alert("Lỗi khi cập nhật dữ liệu.");
    }
  };

  // xuất excel
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

  // xoá dữ liệu tuần
  const handleDelete = async () => {
    if (!week) return;
    if (!window.confirm(`Bạn có chắc muốn xoá dữ liệu tuần ${week}?`)) return;
    try {
      await api.delete(`/api/class-weekly-scores/${week}`);
      alert("Đã xoá dữ liệu tuần!");
      setScores([]);
      fetchWeeksWithData();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Lỗi khi xoá dữ liệu.");
    }
  };

  useEffect(() => {
    fetchWeeksWithData();
    fetchClasses();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (week !== "") {
      fetchScores(Number(week));
    }
  }, [week, weeksWithData, disciplineMax]);

  // render bảng theo khối
  const renderTable = (grade: string, title: string) => {
    const rows = scores
      .filter((s) => s.grade === grade)
      .sort((a, b) => a.className.localeCompare(b.className));

    if (rows.length === 0) return null;

    return (
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>
          {title}
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
                <TableCell>Điểm kỷ luật</TableCell>
                <TableCell>Học tập</TableCell>
                <TableCell>Thưởng</TableCell>
                <TableCell>Tổng điểm</TableCell>
                <TableCell>Hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.className}
                  sx={
                    row.ranking === 1
                      ? { backgroundColor: "#fff59d" }
                      : row.ranking === 2
                      ? { backgroundColor: "#a5d6a7" }
                      : row.ranking === 3
                      ? { backgroundColor: "#ffcc80" }
                      : {}
                  }
                >
                  <TableCell>{row.className}</TableCell>
                  <TableCell>{row.attendanceScore}</TableCell>
                  <TableCell>{row.hygieneScore}</TableCell>
                  <TableCell>{row.lineUpScore}</TableCell>
                  <TableCell>{row.violationScore}</TableCell>
                  <TableCell>{row.totalDiscipline}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.academicScore || 0}
                      onChange={(e) =>
                        handleScoreChange(
                          row.className,
                          "academicScore",
                          Number(e.target.value)
                        )
                      }
                      inputProps={{ style: { width: 60 } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={row.bonusScore || 0}
                      onChange={(e) =>
                        handleScoreChange(
                          row.className,
                          "bonusScore",
                          Number(e.target.value)
                        )
                      }
                      inputProps={{ style: { width: 60 } }}
                    />
                  </TableCell>
                  <TableCell>{row.totalScore}</TableCell>
                  <TableCell>{row.ranking}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm thi đua tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          displayEmpty
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {[...Array(20).keys()].map((i) => {
            const w = i + 1;
            const hasData = weeksWithData.includes(w);
            return (
              <MenuItem key={w} value={w}>
                Tuần {w} {hasData ? "(Đã có dữ liệu)" : ""}
              </MenuItem>
            );
          })}
        </Select>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!week || scores.length === 0 || weeksWithData.includes(Number(week))}
        >
          Lưu
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleUpdate}
          disabled={!week}
        >
          Cập nhật
        </Button>
        <Button variant="outlined" onClick={handleExport} disabled={!week}>
          Xuất Excel
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          disabled={!week}
        >
          Xoá tuần
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {renderTable("10", "Khối 10")}
          {renderTable("11", "Khối 11")}
          {renderTable("12", "Khối 12")}
          {renderTable("Khác", "Khối khác")}
        </>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
