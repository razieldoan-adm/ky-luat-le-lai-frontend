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
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<number | "" | "all">("");
  const [classList, setClassList] = useState<string[]>([]);
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  // Load dữ liệu
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
      setViolations(dataWithWeek);
      setFiltered(dataWithWeek);
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu vi phạm:", err);
    }
  };

  const applyFilters = () => {
    let data = violations;
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
    setFiltered(data);
  };

  // ✅ Gọi API xử lý
  const handleMarkAsHandled = async (id: string, by: "GVCN" | "PGT") => {
    try {
      await api.patch(`/api/violations/${id}/handle`, { handledBy: by });
      await fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xử lý vi phạm:", err);
    }
  };

  const handleDeleteViolation = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xoá vi phạm này không?")) return;
    try {
      await api.delete(`/api/violations/${id}`);
      fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xoá vi phạm:", err);
    }
  };

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", py: 4 }}>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        Quản lý xử lý vi phạm học sinh
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          label="Chọn lớp"
          select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
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
          onChange={(e) =>
            setSelectedWeek(
              e.target.value === "all"
                ? "all"
                : e.target.value === ""
                ? ""
                : Number(e.target.value)
            )
          }
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">-- Xem tất cả --</MenuItem>
          {weekList.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={applyFilters}>
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
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, i) => {
                const matchedRule = rules.find(
                  (r) => r.title === v.description
                );
                return (
                  <TableRow key={v._id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>{v.className}</TableCell>
                    <TableCell>{v.description}</TableCell>
                    <TableCell>{matchedRule?.point || 0}</TableCell>
                    <TableCell>
                      {v.time ? dayjs(v.time).format("DD/MM/YYYY") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {v.handled ? (
                        <Box
                          sx={{
                            bgcolor: "#c8e6c9",
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
                            bgcolor: "#ffcdd2",
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
                    <TableCell>{v.handledBy || "-"}</TableCell>
                    <TableCell>
                      {!v.handled ? (
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleMarkAsHandled(v._id, "GVCN")}
                          >
                            GVCN
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleMarkAsHandled(v._id, "PGT")}
                          >
                            PGT
                          </Button>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 13, color: "gray" }}>
                          Đã xử lý
                        </Typography>
                      )}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteViolation(v._id)}
                      >
                        Xoá
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
