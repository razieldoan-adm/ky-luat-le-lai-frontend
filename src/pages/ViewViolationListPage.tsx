import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Stack,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { getWeeksAndCurrentWeek } from "../types/weekHelper";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  weekNumber?: number;
  handled?: boolean;
  handledBy?: string;
  penalty?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function ViewViolationListPage() {
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<number | "" | "all">("");
  const [classList, setClassList] = useState<string[]>([]);
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    fetchClasses();
    fetchRules();
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (weekList.length > 0) fetchViolations();
  }, [weekList]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const validClasses = res.data
        .filter((cls: any) => cls.teacher)
        .map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get("/api/rules");
      setRules(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy rules:", err);
    }
  };

  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      const allWeeks: AcademicWeek[] = res.data;
      const { currentWeek } = await getWeeksAndCurrentWeek();
      const filteredWeeks = allWeeks.filter((w) => w.weekNumber <= currentWeek);
      setWeekList(filteredWeeks);
      const currentWeekObj = filteredWeeks.find(
        (w) => w.weekNumber === currentWeek
      );
      if (currentWeekObj) setSelectedWeek(currentWeekObj.weekNumber);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách tuần:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations/all/all-student");
      const rawData = res.data;
      const dataWithWeek = rawData.map((v: any) => {
        const violationDate = dayjs(v.time).startOf("day");
        const matchedWeek = weekList.find(
          (w) =>
            violationDate.isSameOrAfter(dayjs(w.startDate).startOf("day")) &&
            violationDate.isSameOrBefore(dayjs(w.endDate).endOf("day"))
        );
        return {
          ...v,
          weekNumber: matchedWeek?.weekNumber || null,
          handledBy: v.handledBy || "",
          handled: v.handled || false,
        };
      });
      setAllViolations(dataWithWeek);
      applyFilters(dataWithWeek); // ✅ tự động áp filter sau khi fetch
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu vi phạm:", err);
    }
  };

  const applyFilters = (sourceData = allViolations) => {
    let data = [...sourceData];
    if (selectedClass) {
      data = data.filter(
        (v) =>
          v.className.trim().toLowerCase() ===
          selectedClass.trim().toLowerCase()
      );
    }
    if (selectedWeek !== "" && selectedWeek !== "all") {
      data = data.filter((v) => v.weekNumber === selectedWeek);
    }
    setFilteredViolations(data);
  };

  const handleMarkAsHandled = async (id: string, by: "GVCN" | "PGT") => {
    try {
      await api.put(`/api/violations/${id}/handle`, {
        handled: true,
        handledBy: by,
        handlingMethod: `${by} xử lý`,
      });
      await fetchViolations(); // ✅ dữ liệu mới → tự lọc lại
    } catch (err) {
      console.error("Lỗi khi xử lý vi phạm:", err);
    }
  };

  const renderTime = (date: Date) => dayjs(date).format("DD/MM/YYYY");

  // ✅ Tổng điểm trừ (chỉ tính PGT xử lý)
  const classTotals: Record<string, number> = {};
  filteredViolations.forEach((v) => {
    const matchedRule = rules.find((r) => r.title === v.description);
    const point = matchedRule?.point || 0;
    if (v.handledBy === "PGT") {
      classTotals[v.className] = (classTotals[v.className] || 0) + point;
    }
  });

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", py: 4 }}>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        Quản lý xử lý vi phạm học sinh
      </Typography>

      <Typography align="center" sx={{ color: "gray", mb: 2 }}>
        Nếu GVCN đã xử lý vi phạm của học sinh vui lòng check vào ô{" "}
        <b>GVCN tiếp nhận</b>. Xin cám ơn.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          label="Chọn lớp"
          select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            applyFilters();
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">-- Chọn lớp --</MenuItem>
          {classList.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Chọn tuần"
          select
          value={selectedWeek}
          onChange={(e) => {
            const val =
              e.target.value === "all"
                ? "all"
                : e.target.value === ""
                ? ""
                : Number(e.target.value);
            setSelectedWeek(val);
            applyFilters();
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">-- Xem tất cả --</MenuItem>
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={() => applyFilters()}>
          Áp dụng
        </Button>
      </Stack>

      <Paper elevation={3} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#87cafe" }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Người xử lý</TableCell>
              <TableCell>GVCN tiếp nhận</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredViolations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{renderTime(v.time)}</TableCell>
                  <TableCell>
                    {v.handled ? (
                      <Box
                        sx={{
                          backgroundColor: "green",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Đã xử lý
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          backgroundColor: "#ffcccc",
                          color: "red",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Chưa xử lý
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{v.handledBy || "—"}</TableCell>
                  <TableCell>
                    {!v.handled ? (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleMarkAsHandled(v._id, "GVCN")}
                      >
                        GVCN tiếp nhận
                      </Button>
                    ) : (
                      <Typography color="green" fontWeight="bold">
                        ✓ GVCN đã nhận
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Box mt={4}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Tổng điểm trừ (chỉ tính khi PGT xử lý)
        </Typography>
        <Table size="small" sx={{ maxWidth: 500 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>Lớp</TableCell>
              <TableCell align="right">Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(classTotals).map(([cls, total]) => (
              <TableRow key={cls}>
                <TableCell>{cls}</TableCell>
                <TableCell align="right">{total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
