import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import api from "../../api/api";

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<any[]>([]);
  const [originalScores, setOriginalScores] = useState<any[]>([]);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Lấy danh sách tuần đã có dữ liệu
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/class-weekly-scores/weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

  // Lấy danh sách lớp có GVCN
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/api/classes/with-teacher");
        setClassOptions(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  // Lấy điểm max từ settings
  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const res = await api.get("/api/settings");
        if (res.data?.disciplineMax) {
          setDisciplineMax(res.data.disciplineMax);
        }
      } catch (err) {
        console.error("Lỗi khi lấy settings:", err);
      }
    };
    fetchSetting();
  }, []);

  // Load dữ liệu khi chọn tuần
  const fetchScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      let res = await api.get(`/api/class-weekly-scores?weekNumber=${weekNumber}`);
      let data = res.data;

      // Nếu chưa có dữ liệu thì load từ temp
      if (!data || data.length === 0) {
        const tempRes = await api.get(`/api/class-weekly-scores/temp?weekNumber=${weekNumber}`);
        data = tempRes.data;
      }

      // Chỉ giữ các lớp nằm trong danh sách classOptions
      const validClassIds = classOptions.map((c) => c._id);
      data = data.filter((row: any) => validClassIds.includes(row.classId));

      const withTotals = recalcScores(data);
      setScores(withTotals);
      setOriginalScores(JSON.parse(JSON.stringify(withTotals)));
      setHasChanges(false);
    } catch (err) {
      console.error("Lỗi khi load dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  // Hàm tính lại tổng điểm và xếp hạng
  const recalcScores = (data: any[]) => {
    // Gom theo khối
    const grouped: { [grade: string]: any[] } = {};
    data.forEach((row) => {
      const totalScore =
        disciplineMax -
        (row.attendanceScore * 5 +
          row.hygieneScore +
          row.lineUpScore +
          row.violationScore) +
        row.academicScore +
        row.bonusScore;

      const updated = { ...row, totalScore };
      if (!grouped[row.grade]) grouped[row.grade] = [];
      grouped[row.grade].push(updated);
    });

    // Xếp hạng theo từng khối
    Object.keys(grouped).forEach((grade) => {
      grouped[grade].sort((a, b) => b.totalScore - a.totalScore);
      grouped[grade].forEach((row, index) => {
        row.ranking = index + 1;
      });
    });

    return Object.values(grouped).flat();
  };

  // Xử lý thay đổi điểm nhập (bonus/academic)
  const handleScoreChange = (classId: string, field: string, value: number) => {
    const newScores = scores.map((row) =>
      row.classId === classId ? { ...row, [field]: value } : row
    );
    const withTotals = recalcScores(newScores);
    setScores(withTotals);

    // Kiểm tra thay đổi
    const changed = JSON.stringify(withTotals) !== JSON.stringify(originalScores);
    setHasChanges(changed);
  };

  // Cập nhật dữ liệu
  const handleUpdate = async () => {
    if (!selectedWeek) return;
    try {
      await api.post(`/api/class-weekly-scores/update/${selectedWeek}`, scores);
      setOriginalScores(JSON.parse(JSON.stringify(scores)));
      setHasChanges(false);
      alert("Cập nhật thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
      alert("Cập nhật thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Nhập điểm thi đua tuần
      </Typography>

      {/* Chọn tuần */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography mr={2}>Chọn tuần:</Typography>
        <Select
          value={selectedWeek}
          onChange={(e) => {
            const week = e.target.value as number;
            setSelectedWeek(week);
            fetchScores(week);
          }}
          displayEmpty
        >
          <MenuItem value="">-- Chọn tuần --</MenuItem>
          {weeks.map((week) => (
            <MenuItem key={week} value={week}>
              Tuần {week}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        selectedWeek && (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lớp</TableCell>
                  <TableCell>Khối</TableCell>
                  <TableCell>Điểm Chuyên cần</TableCell>
                  <TableCell>Điểm Vệ sinh</TableCell>
                  <TableCell>Điểm Xếp hàng</TableCell>
                  <TableCell>Điểm Vi phạm</TableCell>
                  <TableCell>Học tập</TableCell>
                  <TableCell>Thưởng</TableCell>
                  <TableCell>Tổng điểm</TableCell>
                  <TableCell>Xếp hạng</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scores.map((row) => (
                  <TableRow
                    key={row.classId}
                    sx={{
                      backgroundColor:
                        row.ranking === 1
                          ? "#ffd700"
                          : row.ranking === 2
                          ? "#c0c0c0"
                          : row.ranking === 3
                          ? "#cd7f32"
                          : "transparent",
                    }}
                  >
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.attendanceScore}</TableCell>
                    <TableCell>{row.hygieneScore}</TableCell>
                    <TableCell>{row.lineUpScore}</TableCell>
                    <TableCell>{row.violationScore}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={row.academicScore}
                        onChange={(e) =>
                          handleScoreChange(row.classId, "academicScore", Number(e.target.value))
                        }
                        style={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={row.bonusScore}
                        onChange={(e) =>
                          handleScoreChange(row.classId, "bonusScore", Number(e.target.value))
                        }
                        style={{ width: 60 }}
                      />
                    </TableCell>
                    <TableCell>{row.totalScore}</TableCell>
                    <TableCell>{row.ranking}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                disabled={!hasChanges}
                onClick={handleUpdate}
              >
                Cập nhật
              </Button>
            </Box>
          </>
        )
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
