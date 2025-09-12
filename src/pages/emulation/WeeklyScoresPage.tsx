import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
} from "@mui/material";

type ClassScore = {
  _id: string;
  className: string;
  grade: string;
  academicScore: number;   // SĐB
  bonusScore: number;      // ✅ Điểm thưởng
  violationScore: number;  // ❌ Điểm kỷ luật
  hygieneScore: number;    // Vệ sinh
  diligenceScore: number;  // Chuyên cần
  totalViolation?: number; // tính toán frontend
  totalScore?: number;     // tính toán frontend
};

export default function WeeklyScoresPage() {
  const [week, setWeek] = useState<number>(1);
  const [data, setData] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://ky-luat-le-lai-backend.onrender.com/api/class-violation-scores/week/${week}`
        );
        if (!res.ok) throw new Error("Fetch failed");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [week]);

  // Tính toán trên frontend
  const processed: ClassScore[] = data.map((cls) => {
    const totalViolation = cls.violationScore;
    const totalScore =
      cls.academicScore +
      cls.bonusScore +
      cls.hygieneScore +
      cls.diligenceScore -
      totalViolation;

    return { ...cls, totalViolation, totalScore };
  });

  // Gom nhóm theo khối
  const grouped: Record<string, ClassScore[]> = {};
  processed.forEach((cls) => {
    if (!grouped[cls.grade]) grouped[cls.grade] = [];
    grouped[cls.grade].push(cls);
  });
  Object.keys(grouped).forEach((g) => {
    grouped[g].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  });

  return (
    <div style={{ padding: "24px" }}>
      <Typography variant="h4" gutterBottom>
        Bảng điểm thi đua tuần
      </Typography>

      {/* Dropdown chọn tuần */}
      <FormControl style={{ minWidth: 200, marginBottom: 24 }}>
        <InputLabel>Chọn tuần</InputLabel>
        <Select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              Tuần {i + 1}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <CircularProgress />
      ) : (
        Object.keys(grouped).map((grade) => (
          <Card key={grade} style={{ marginBottom: 24 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Khối {grade}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell>SĐB</TableCell>
                      <TableCell>Điểm thưởng</TableCell>
                      <TableCell>Vệ sinh</TableCell>
                      <TableCell>Chuyên cần</TableCell>
                      <TableCell>Vi phạm</TableCell>
                      <TableCell>Tổng điểm</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grouped[grade].map((cls, idx) => (
                      <TableRow
                        key={cls._id}
                        style={{
                          backgroundColor: idx === 0 ? "#d1f7d1" : "inherit",
                        }}
                      >
                        <TableCell>{cls.className}</TableCell>
                        <TableCell>{cls.academicScore}</TableCell>
                        <TableCell>{cls.bonusScore}</TableCell>
                        <TableCell>{cls.hygieneScore}</TableCell>
                        <TableCell>{cls.diligenceScore}</TableCell>
                        <TableCell style={{ color: "red", fontWeight: 600 }}>
                          -{cls.totalViolation}
                        </TableCell>
                        <TableCell style={{ fontWeight: "bold" }}>
                          {cls.totalScore}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
