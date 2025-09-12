import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

type ClassScore = {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  cleanlinessScore: number;
  attendanceScore: number;
  lineScore: number;
  totalDiscipline: number;
  finalScore: number;
  rank: number;
};

type GradeData = {
  [grade: string]: ClassScore[];
};

const WeeklyScoresPage: React.FC = () => {
  const [week, setWeek] = useState<string>("1");
  const [data, setData] = useState<GradeData>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Load dữ liệu từ backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/class-violation-scores/week/${week}`
        );
        if (!res.ok) throw new Error("Lỗi khi tải dữ liệu");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
        setData({});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [week]);

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <CardContent>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <EmojiEventsIcon style={{ color: "#fbc02d", marginRight: 8 }} />
            <Typography variant="h6" fontWeight="bold">
              Kết quả thi đua toàn trường theo tuần
            </Typography>
          </div>

          {/* Dropdown chọn tuần */}
          <FormControl style={{ width: 120, marginBottom: 24 }}>
            <InputLabel>Tuần</InputLabel>
            <Select value={week} onChange={(e) => setWeek(e.target.value)}>
              {Array.from({ length: 20 }, (_, i) => (
                <MenuItem key={i + 1} value={(i + 1).toString()}>
                  Tuần {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {loading ? (
            <Typography>Đang tải dữ liệu...</Typography>
          ) : (
            Object.keys(data).map((grade) => (
              <div key={grade} style={{ marginBottom: 32 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Khối {grade} ({data[grade].length} lớp)
                </Typography>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>STT</TableCell>
                        <TableCell>Lớp</TableCell>
                        <TableCell>Học tập</TableCell>
                        <TableCell>Điểm thưởng</TableCell>
                        <TableCell>Kỷ luật</TableCell>
                        <TableCell>Vệ sinh</TableCell>
                        <TableCell>Chuyên cần</TableCell>
                        <TableCell>Xếp hàng</TableCell>
                        <TableCell>Tổng điểm Nề nếp</TableCell>
                        <TableCell>Tổng kết</TableCell>
                        <TableCell>Xếp hạng</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data[grade].map((cls, idx) => (
                        <TableRow
                          key={cls.className}
                          style={{
                            backgroundColor: cls.rank === 1 ? "#fff9c4" : "inherit",
                            fontWeight: cls.rank === 1 ? "bold" as any : "normal",
                          }}
                        >
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{cls.className}</TableCell>
                          <TableCell>{cls.academicScore}</TableCell>
                          <TableCell>{cls.bonusScore}</TableCell>
                          <TableCell>{cls.violationScore}</TableCell>
                          <TableCell>{cls.cleanlinessScore}</TableCell>
                          <TableCell>{cls.attendanceScore}</TableCell>
                          <TableCell>{cls.lineScore}</TableCell>
                          <TableCell>{cls.totalDiscipline}</TableCell>
                          <TableCell>{cls.finalScore}</TableCell>
                          <TableCell>{cls.rank}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyScoresPage;
