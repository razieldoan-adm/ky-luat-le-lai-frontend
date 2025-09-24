import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import api from "../../api/api";

interface Violation {
  _id: string;
  studentId: string;
  name: string;
  className: string;
  violationType: string;
  time: string;
  handlingMethod: string;
  point: number;
  week?: string;
}

const UnhandledViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [weekList, setWeekList] = useState<string[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [filterByCount, setFilterByCount] = useState<boolean>(false);

  // Lấy danh sách vi phạm
  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations");
      setViolations(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách vi phạm:", err);
    }
  };

  // Lấy danh sách lớp
  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  // Lấy danh sách tuần từ setting
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách tuần:", err);
    }
  };

  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchWeeks();
  }, []);

  // Gom nhóm theo học sinh
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    violations.forEach((v) => {
      map.set(v.studentId, (map.get(v.studentId) || 0) + 1);
    });
    return map;
  }, [violations]);

  // Lọc dữ liệu
  const filteredViolations = useMemo(() => {
    let data = [...violations];

    if (selectedClass) {
      data = data.filter((v) => v.className === selectedClass);
    }

    if (selectedWeek) {
      data = data.filter((v) => v.week === selectedWeek);
    }

    if (searchName.trim() !== "") {
      const keyword = searchName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      data = data.filter((v) => {
        const studentName = v.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return studentName.includes(keyword);
      });
    }

    if (filterByCount) {
      data = data.filter((v) => (countMap.get(v.studentId) || 0) >= 3);
    }

    // Sắp xếp theo lớp, sau đó theo tên
    data.sort((a, b) => {
      if (a.className === b.className) {
        return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
      }
      return a.className.localeCompare(b.className, "vi", { numeric: true });
    });

    return data;
  }, [violations, selectedClass, selectedWeek, searchName, filterByCount, countMap]);

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Học sinh vi phạm (báo cáo)
      </Typography>

      {/* Bộ lọc */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        {/* Dropdown chọn lớp */}
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">Tất cả lớp</MenuItem>
          {classes.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </Select>

        {/* Dropdown chọn tuần */}
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">Tất cả tuần</MenuItem>
          {weekList.map((w) => (
            <MenuItem key={w} value={w}>
              {w}
            </MenuItem>
          ))}
        </Select>

        {/* Tìm theo tên */}
        <TextField
          placeholder="Tìm theo tên học sinh"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        {/* Chỉ học sinh >= 3 vi phạm */}
        <FormControlLabel
          control={
            <Checkbox
              checked={filterByCount}
              onChange={(e) => setFilterByCount(e.target.checked)}
            />
          }
          label="Chỉ học sinh >= 3 vi phạm"
        />

        <Button
          variant="outlined"
          onClick={() => {
            setSelectedClass("");
            setSelectedWeek("");
            setSearchName("");
            setFilterByCount(false);
          }}
        >
          Xóa lọc
        </Button>
      </Box>

      {/* Bảng danh sách */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.map((v, idx) => (
              <TableRow key={v._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.className}</TableCell>
                <TableCell>{v.violationType}</TableCell>
                <TableCell>
                  {new Date(v.time).toLocaleDateString("vi-VN")}
                </TableCell>
                <TableCell>{v.handlingMethod}</TableCell>
                <TableCell>{v.point}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UnhandledViolationsPage;
