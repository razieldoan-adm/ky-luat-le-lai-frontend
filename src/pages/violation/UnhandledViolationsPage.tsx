import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface Violation {
  _id: string;
  name: string;
  className: string;
  weekNumber: number;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

interface CountedStudent {
  displayName: string;
  className: string;
  count: number;
}

export default function FrequentViolationsPage() {
  const [week, setWeek] = useState("");
  const [className, setClassName] = useState("");
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [violations, setViolations] = useState<CountedStudent[]>([]);
  const [loading, setLoading] = useState(false);

  // 📌 Lấy danh sách lớp để hiển thị select
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

  // 📌 Hàm fetch dữ liệu vi phạm theo tuần / lớp
  const fetchViolations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (week) params.append("week", week);
      if (className) params.append("className", className);

      const res = await api.get(`/api/violations?${params.toString()}`);

      // Gom nhóm và lọc ≥ 3
      const data: Violation[] = res.data;
      const countMap: {
        [key: string]: { count: number; className: string; displayName: string };
      } = {};

      data.forEach((v) => {
        const normalized = v.name.trim().toLowerCase();
        if (!countMap[normalized]) {
          countMap[normalized] = {
            count: 1,
            className: v.className,
            displayName: v.name,
          };
        } else {
          countMap[normalized].count += 1;
        }
      });

      const result = Object.values(countMap).filter((s) => s.count >= 3);
      setViolations(result);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "80vw", mx: "auto", py: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Học sinh vi phạm từ 3 lần trở lên
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Chọn tuần"
          select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {[...Array(20)].map((_, i) => (
            <MenuItem key={i + 1} value={String(i + 1)}>
              Tuần {i + 1}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Chọn lớp"
          select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className} — {cls.teacher}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"
          color="primary"
          onClick={fetchViolations}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Lọc"}
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell align="center">Số lần vi phạm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.length > 0 ? (
              violations.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell>{s.displayName}</TableCell>
                  <TableCell>{s.className}</TableCell>
                  <TableCell align="center">{s.count}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
