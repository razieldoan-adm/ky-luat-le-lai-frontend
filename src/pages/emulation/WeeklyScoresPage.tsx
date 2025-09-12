import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";

interface ClassScore {
  className: string;
  totalScore: number;
  rank: number;
}

interface GradeGroup {
  grade: string;
  classes: ClassScore[];
}

export default function WeeklyScoresPage() {
  const [week, setWeek] = useState<number>(1);
  const [scores, setScores] = useState<GradeGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchScores = async (weekNumber: number) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/class-violation-scores/week/${weekNumber}`
      );
      const data = await res.json();
      setScores(data);
    } catch (err) {
      console.error("Error fetching scores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores(week);
  }, [week]);

  return (
    <div style={{ padding: "20px" }}>
      <Typography variant="h5" gutterBottom>
        🏆 Kết quả thi đua toàn trường theo tuần
      </Typography>

      <Card style={{ marginBottom: "20px" }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel id="week-select-label">Tuần</InputLabel>
            <Select
              labelId="week-select-label"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <MenuItem key={w} value={w}>
                  Tuần {w}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {loading ? (
        <CircularProgress />
      ) : (
        scores.map((group) => (
          <Card key={group.grade} style={{ marginBottom: "20px" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Khối {group.grade}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lớp</TableCell>
                      <TableCell align="center">Tổng điểm</TableCell>
                      <TableCell align="center">Xếp hạng</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.classes.map((cls) => (
                      <TableRow
                        key={cls.className}
                        style={{
                          backgroundColor:
                            cls.rank === 1 ? "#e3f2fd" : "transparent",
                        }}
                      >
                        <TableCell>{cls.className}</TableCell>
                        <TableCell align="center">{cls.totalScore}</TableCell>
                        <TableCell align="center">{cls.rank}</TableCell>
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
