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
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

type ErrorType = "" | "Lỗi 1" | "Lỗi 2" | "Lỗi 3" | "Lỗi 4";

interface ClassLineUpSummary {
  className: string;
  week: number;
  errors: ErrorType[]; // 10 ô, mỗi ô chọn 1 lỗi
  totalScore: number;
}

const errorOptions: ErrorType[] = ["", "Lỗi 1", "Lỗi 2", "Lỗi 3", "Lỗi 4"];

const ClassLineUpSummaryPage = () => {
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [classList, setClassList] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<ClassLineUpSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classList.length > 0) {
      initSummaries();
    }
  }, [classList, selectedWeek]);

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy tuần:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClassList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy lớp:", err);
    }
  };

  const initSummaries = () => {
    const initData = classList.map((cls) => ({
      className: cls,
      week: selectedWeek,
      errors: Array(10).fill(""),
      totalScore: 0,
    }));
    setSummaries(initData);
  };

  const handleErrorChange = (
    className: string,
    index: number,
    value: ErrorType
  ) => {
    setSummaries((prev) =>
      prev.map((item) =>
        item.className === className
          ? {
              ...item,
              errors: item.errors.map((err, i) =>
                i === index ? value : err
              ),
              totalScore: item.errors.filter((e, i) =>
                i === index ? value !== "" : e !== ""
              ).length * 10,
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.post("/api/class-lineup-summaries", summaries);
      alert("Lưu thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Lỗi khi lưu dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const getWeekLabel = (week: AcademicWeek) => {
    const today = new Date();
    const start = new Date(week.startDate);
    const end = new Date(week.endDate);

    if (today < start) return `Tuần ${week.weekNumber} (chưa diễn ra)`;
    if (today > end) return `Tuần ${week.weekNumber} (đã qua)`;
    return `Tuần ${week.weekNumber} (hiện tại)`;
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Nhập điểm xếp hạng theo tuần
      </Typography>

      <Box mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
        >
          {weekList.map((week) => (
            <MenuItem key={week._id} value={week.weekNumber}>
              {getWeekLabel(week)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableCell key={i}>Ô {i + 1}</TableCell>
                ))}
                <TableCell>Tổng điểm</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaries.map((row) => (
                <TableRow key={row.className}>
                  <TableCell>{row.className}</TableCell>
                  {row.errors.map((err, i) => (
                    <TableCell key={i}>
                      <Select
                        value={err}
                        onChange={(e) =>
                          handleErrorChange(
                            row.className,
                            i,
                            e.target.value as ErrorType
                          )
                        }
                        displayEmpty
                        fullWidth
                      >
                        {errorOptions.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt === "" ? "Trống" : opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  ))}
                  <TableCell>{row.totalScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={loading}
        >
          Lưu dữ liệu
        </Button>
      </Box>
    </Box>
  );
};

export default ClassLineUpSummaryPage;
