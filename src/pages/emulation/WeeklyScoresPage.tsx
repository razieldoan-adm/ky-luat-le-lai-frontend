import React, { useEffect, useState } from "react";
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
} from "@mui/material";
import api from "../../api/api";

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [weeksWithScores, setWeeksWithScores] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [needUpdate, setNeedUpdate] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);

  // Lấy danh sách tuần học + tuần đã có dữ liệu
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const resWeeks = await api.get("/study-weeks");
        setWeeks(resWeeks.data || []);

        const resWithScores = await api.get("/weekly-scores/weeks");
        setWeeksWithScores(resWithScores.data?.weeks || []);
      } catch (err) {
        console.error("Error fetching weeks:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Khi chọn tuần → load dữ liệu DB nếu có
  useEffect(() => {
    const fetchScores = async () => {
      if (!selectedWeek) return;
      try {
        const res = await api.get("/weekly-scores", {
          params: { weekNumber: selectedWeek },
        });
        if (res.data && res.data.length > 0) {
          setScores(res.data);
          setIsCalculated(true);
          // check thay đổi
          const resCheck = await api.get(`/weekly-scores/check-changes/${selectedWeek}`);
          setNeedUpdate(resCheck.data?.changed || false);
        } else {
          setScores([]);
          setIsCalculated(false);
          setNeedUpdate(false);
        }
      } catch (err) {
        console.error("Error fetching weekly scores:", err);
      }
    };
    fetchScores();
  }, [selectedWeek]);

  // Load dữ liệu tạm
  const handleLoadTemp = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/weekly-scores/temp", {
        params: { weekNumber: selectedWeek },
      });
      setScores(res.data || []);
      setIsCalculated(false);
      setNeedUpdate(false);
    } catch (err) {
      console.error("Error loading temp data:", err);
    }
  };

  // Tính xếp hạng
  const handleCalculate = () => {
    const groupedByGrade: { [grade: string]: any[] } = {};
    scores.forEach((s) => {
      const grade = s.className.substring(0, 2);
      if (!groupedByGrade[grade]) groupedByGrade[grade] = [];
      groupedByGrade[grade].push(s);
    });

    const newScores: any[] = [];
    Object.values(groupedByGrade).forEach((group: any) => {
      const sorted = [...group].sort((a, b) => b.total - a.total);
      sorted.forEach((item, index) => {
        newScores.push({ ...item, rank: index + 1 });
      });
    });

    setScores(newScores);
    setIsCalculated(true);
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      await api.post("/weekly-scores/save", {
        weekNumber: selectedWeek,
        scores,
      });
      alert("Đã lưu dữ liệu");
      setNeedUpdate(false);
    } catch (err) {
      console.error("Error saving scores:", err);
    }
  };

  // Cập nhật dữ liệu
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.post(`/weekly-scores/update/${selectedWeek}`);
      setScores(res.data || []);
      handleCalculate();
      alert("Đã cập nhật dữ liệu");
    } catch (err) {
      console.error("Error updating scores:", err);
    }
  };

  // Xuất Excel
  const handleExport = async () => {
    if (!selectedWeek) return;
    try {
      const res = await api.get("/weekly-scores/export", {
        params: { weekNumber: selectedWeek },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `weekly-scores-week${selectedWeek}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Error exporting Excel:", err);
    }
  };

  // Chỉnh tay điểm học tập/thưởng
  const handleScoreChange = (index: number, field: string, value: number) => {
    const newScores = [...scores];
    newScores[index][field] = value;
    // cập nhật total
    newScores[index].total =
      (newScores[index].study || 0) +
      (newScores[index].bonus || 0) +
      (newScores[index].discipline || 0) +
      (newScores[index].hygiene || 0) +
      (newScores[index].attendance || 0) +
      (newScores[index].queue || 0);
    setScores(newScores);
    setIsCalculated(false); // cần tính lại xếp hạng
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Điểm thi đua tuần</h2>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Chọn tuần</InputLabel>
        <Select
          value={selectedWeek || ""}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
        >
          {weeks.map((w) => {
            const hasData = weeksWithScores.includes(w.weekNumber);
            return (
              <MenuItem
                key={w.weekNumber}
                value={w.weekNumber}
                disabled={hasData}
                sx={{ color: hasData ? "gray" : "black" }}
              >
                {`Tuần ${w.weekNumber}`}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <div style={{ marginTop: 20 }}>
        {!scores.length && selectedWeek && (
          <Button variant="contained" onClick={handleLoadTemp}>
            Load dữ liệu
          </Button>
        )}

        {!!scores.length && !isCalculated && (
          <Button variant="contained" onClick={handleCalculate}>
            Tính xếp hạng
          </Button>
        )}

        {!!scores.length && isCalculated && !needUpdate && (
          <Button variant="contained" onClick={handleSave}>
            Lưu
          </Button>
        )}

        {!!scores.length && needUpdate && (
          <Button variant="contained" color="warning" onClick={handleUpdate}>
            Cập nhật
          </Button>
        )}

        {!!scores.length && (
          <Button
            variant="outlined"
            color="success"
            onClick={handleExport}
            style={{ marginLeft: 10 }}
          >
            Xuất Excel
          </Button>
        )}
      </div>

      {scores.length > 0 && (
        <TableContainer component={Paper} sx={{ marginTop: 3 }}>
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
              {scores.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={row.study || 0}
                      onChange={(e) =>
                        handleScoreChange(index, "study", Number(e.target.value))
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={row.bonus || 0}
                      onChange={(e) =>
                        handleScoreChange(index, "bonus", Number(e.target.value))
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{row.discipline || 0}</TableCell>
                  <TableCell>{row.hygiene || 0}</TableCell>
                  <TableCell>{row.attendance || 0}</TableCell>
                  <TableCell>{row.queue || 0}</TableCell>
                  <TableCell>{row.nenepTotal || 0}</TableCell>
                  <TableCell>{row.total || 0}</TableCell>
                  <TableCell>{row.rank || "-"}</TableCell>
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
