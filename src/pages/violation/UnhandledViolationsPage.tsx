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
  Collapse,
  IconButton,
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import api from "../../api/api";

interface Violation {
  _id: string;
  name: string;
  className: string;
  violationType: string;
  description?: string;
  date: string;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

interface StudentViolation {
  displayName: string;
  className: string;
  count: number;
  details: Violation[];
}

export default function UnhandledViolationsPage() {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [className, setClassName] = useState("");
  const [name, setName] = useState("");
  const [students, setStudents] = useState<StudentViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [openRows, setOpenRows] = useState<{ [key: string]: boolean }>({});

  // 📌 Lấy danh sách lớp
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

  // 📌 Gọi API lấy danh sách vi phạm
  const fetchViolations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (className) params.append("className", className);
      if (name) params.append("name", name);

      const res = await api.get(`/api/violations?${params.toString()}`);
      const data: Violation[] = res.data;

      // Gom nhóm theo học sinh
      const countMap: {
        [key: string]: { className: string; displayName: string; details: Violation[] };
      } = {};

      data.forEach((v) => {
        const key = v.name.trim().toLowerCase() + "_" + v.className;
        if (!countMap[key]) {
          countMap[key] = {
            className: v.className,
            displayName: v.name,
            details: [v],
          };
        } else {
          countMap[key].details.push(v);
        }
      });

      const result: StudentViolation[] = Object.values(countMap)
        .map((s) => ({
          displayName: s.displayName,
          className: s.className,
          count: s.details.length,
          details: s.details,
        }))
        .filter((s) => s.count > 3);

      setStudents(result);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (key: string) => {
    setOpenRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Box sx={{ width: "90vw", mx: "auto", py: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Học sinh vi phạm trên 3 lần
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
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

        <TextField
          label="Tìm theo tên học sinh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ minWidth: 200 }}
        />

        <Button variant="contained" onClick={fetchViolations} disabled={loading}>
          {loading ? "Đang tải..." : "Lọc"}
        </Button>
      </Stack>

      {/* Danh sách kết quả */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell align="center">Số lần vi phạm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length > 0 ? (
              students.map((s, idx) => {
                const rowKey = `${s.displayName}_${s.className}_${idx}`;
                return (
                  <>
                    <TableRow key={rowKey}>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleRow(rowKey)}>
                          {openRows[rowKey] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{s.displayName}</TableCell>
                      <TableCell>{s.className}</TableCell>
                      <TableCell align="center">{s.count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} sx={{ p: 0 }}>
                        <Collapse in={openRows[rowKey]} timeout="auto" unmountOnExit>
                          <Box sx={{ m: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Chi tiết vi phạm
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Ngày</TableCell>
                                  <TableCell>Loại vi phạm</TableCell>
                                  <TableCell>Mô tả</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {s.details.map((d) => (
                                  <TableRow key={d._id}>
                                    <TableCell>
                                      {new Date(d.date).toLocaleDateString("vi-VN")}
                                    </TableCell>
                                    <TableCell>{d.violationType}</TableCell>
                                    <TableCell>{d.description || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
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
