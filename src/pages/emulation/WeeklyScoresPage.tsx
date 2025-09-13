import { useEffect, useState } from "react";
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
} from "@mui/material";
import axios from "axios";

interface ClassScore {
  _id: string;
  className: string;
  grade: string;
  academicScore: number;
  disciplineScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore: number;
  totalViolation: number;
  totalNeNeScore: number;
  totalRankScore: number;
  rank: number;
  teacher?: string; // GVCN
}

export default function WeeklyScoresPage() {
  const [scores, setScores] = useState<ClassScore[]>([]);
  const [settings, setSettings] = useState<{ maxDisciplineScore: number }>({
    maxDisciplineScore: 100,
  });

  // zebra style
  const getRowStyle = (idx: number) => ({
    backgroundColor: idx % 2 === 0 ? "#f9f9f9" : "#ffffff",
  });

  // fetch settings + scores
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, scoresRes] = await Promise.all([
          axios.get("/api/settings"),
          axios.get("/api/class-violation-scores"),
        ]);

        setSettings(settingsRes.data);

        // chỉ lấy lớp có GVCN
        const filtered = scoresRes.data.filter((s: any) => s.teacher);

        const calculated = filtered.map((s: any) => {
          const totalViolation =
            (s.disciplineScore || 0) +
            (s.hygieneScore || 0) +
            (s.attendanceScore || 0) +
            (s.lineUpScore || 0);

          const totalNeNeScore =
            settingsRes.data.maxDisciplineScore - totalViolation;

          const totalRankScore =
            (s.academicScore || 0) + totalNeNeScore + (s.bonusScore || 0);

          return {
            ...s,
            bonusScore: s.bonusScore || 0,
            totalViolation,
            totalNeNeScore,
            totalRankScore,
          };
        });

        // xếp hạng theo từng khối
        const grouped: Record<string, ClassScore[]> = {};
        calculated.forEach((c) => {
          if (!grouped[c.grade]) grouped[c.grade] = [];
          grouped[c.grade].push(c);
        });

        Object.keys(grouped).forEach((grade) => {
          grouped[grade]
            .sort((a, b) => b.totalRankScore - a.totalRankScore)
            .forEach((cls, i) => (cls.rank = i + 1));
        });

        // gộp lại, giữ nguyên thứ tự grade rồi đến className
        const finalScores = Object.values(grouped)
          .map((arr) => arr.sort((a, b) => a.className.localeCompare(b.className)))
          .flat();

        setScores(finalScores);
      } catch (err) {
        console.error("Lỗi load dữ liệu:", err);
      }
    };

    fetchData();
  }, []);

  const handleBonusChange = (id: string, value: number) => {
    setScores((prev) =>
      prev.map((s) =>
        s._id === id
          ? {
              ...s,
              bonusScore: value,
              totalRankScore: s.academicScore + s.totalNeNeScore + value,
            }
          : s
      )
    );
  };

  const handleSave = async () => {
    try {
      await Promise.all(
        scores.map((s) =>
          axios.put(`/api/class-violation-scores/${s._id}`, {
            bonusScore: s.bonusScore,
          })
        )
      );
      alert("Đã lưu điểm thưởng!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Không thể lưu dữ liệu.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bảng điểm thi đua tuần</h2>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">STT</TableCell>
              <TableCell align="center">Khối</TableCell>
              <TableCell align="center">Lớp</TableCell>
              <TableCell align="center">Học tập</TableCell>
              <TableCell align="center">Kỷ luật</TableCell>
              <TableCell align="center">Vệ sinh</TableCell>
              <TableCell align="center">Chuyên cần</TableCell>
              <TableCell align="center">Xếp hàng</TableCell>
              <TableCell align="center">Tổng vi phạm</TableCell>
              <TableCell align="center">Điểm nề nếp</TableCell>
              <TableCell align="center">Điểm thưởng</TableCell>
              <TableCell align="center">Tổng xếp hạng</TableCell>
              <TableCell align="center">Hạng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s, idx) => (
              <TableRow key={s._id} sx={getRowStyle(idx)}>
                <TableCell align="center">{idx + 1}</TableCell>
                <TableCell align="center">{s.grade}</TableCell>
                <TableCell align="center">{s.className}</TableCell>
                <TableCell align="center">{s.academicScore}</TableCell>
                <TableCell align="center">{s.disciplineScore}</TableCell>
                <TableCell align="center">{s.hygieneScore}</TableCell>
                <TableCell align="center">{s.attendanceScore}</TableCell>
                <TableCell align="center">{s.lineUpScore}</TableCell>
                <TableCell align="center">{s.totalViolation}</TableCell>
                <TableCell align="center">{s.totalNeNeScore}</TableCell>
                <TableCell align="center">
                  <TextField
                    type="number"
                    size="small"
                    value={s.bonusScore}
                    onChange={(e) =>
                      handleBonusChange(s._id, Number(e.target.value) || 0)
                    }
                    sx={{ width: 70, "& input": { textAlign: "center" } }}
                  />
                </TableCell>
                <TableCell align="center">{s.totalRankScore}</TableCell>
                <TableCell align="center" style={{ fontWeight: 600 }}>
                  {s.rank}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSave}
        sx={{ mt: 2 }}
      >
        Lưu điểm thưởng
      </Button>
    </div>
  );
}
