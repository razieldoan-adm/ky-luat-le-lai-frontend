// src/pages/violation/RecordClassLineUpSummaryPage.tsx
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  Select,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../api/api";
import dayjs from "dayjs";

interface StudentSuggestion {
  _id: string;
  name: string;
  className?: string;
}

interface Record {
  _id: string;
  className: string;
  studentName?: string;
  violation: string;
  date: string;
  recorder?: string;
  scoreChange?: number;
  note?: string;
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function RecordClassLineUpSummaryPage() {
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [violation, setViolation] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [recorder] = useState("Th.Huy"); // tạm thời mặc định
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);

  // tuần
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);

  // 3 lỗi cố định
  const violationOptions = [
    'Tập trung xếp hàng quá thời gian quy định',
    'Mất trật tự, đùa giỡn khi xếp hàng',
    'Mất trật tự khi di chuyển, di chuyện lộn xộn không theo hàng lối',
    'Không dọn vệ sinh vị trí xếp hàng',
    'Nhiều học sinh ngồi trong lớp giờ chơi, không ra xếp hàng',
    'Mất trật tự trong khi xếp hàng giờ SHDC',
  ];

  // --- Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  // --- Load tuần học + tuần hiện tại
  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách tuần:", err);
      setWeeks([]);
    }

    try {
      const cur = await api.get("/api/academic-weeks/current");
      const wk = cur.data?.weekNumber ?? null;
      setCurrentWeek(wk);
      setSelectedWeek(wk ?? "");
      // gọi loadRecords với tuần hiện tại (nếu có)
      await loadRecords(wk ?? undefined);
    } catch (err) {
      console.error("Lỗi khi tải tuần hiện tại:", err);
      setCurrentWeek(null);
      setSelectedWeek("");
      await loadRecords(undefined); // load mặc định (backend xử lý tuần hiện tại nếu không có param)
    }
  };

  // --- Load records theo tuần (hỗ trợ response: array hoặc { records: [] })
  const loadRecords = async (weekNumber?: number) => {
    setLoading(true);
    try {
      const params: any = {};
      if (weekNumber) params.weekNumber = weekNumber;
      // nếu backend trả 404 cho endpoint mặc định, log rõ
      const res = await api.get("/api/class-lineup-summaries/weekly", { params });
      // backend có thể trả { weekNumber, startDate, endDate, records } hoặc trả mảng
      let data = res.data;
      if (data && Array.isArray(data)) {
        setRecords(data);
      } else if (data && Array.isArray(data.records)) {
        setRecords(data.records);
      } else {
        // có thể backend trả object rỗng hoặc lỗi định dạng
        setRecords([]);
      }
      console.log("loadRecords response:", res.data);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWeekChange = (e: any) => {
    const value = e.target.value;
    setSelectedWeek(value);
    loadRecords(value || undefined);
  };

  // --- Gợi ý học sinh
  useEffect(() => {
    if (!studentInput.trim() || !className) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params: { name: studentInput.trim(), className },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [studentInput, className]);

  // --- Chọn học sinh
  const handleSelectSuggestion = (s: StudentSuggestion) => {
    if (!selectedStudents.includes(s.name)) setSelectedStudents((p) => [...p, s.name]);
    setStudentInput("");
    setSuggestions([]);
  };

  const removeSelectedStudent = (name: string) => {
    setSelectedStudents((p) => p.filter((x) => x !== name));
  };

  // --- Lưu ghi nhận
  const handleSave = async () => {
    if (!className) return alert("Vui lòng chọn lớp.");
    if (!violation) return alert("Vui lòng chọn loại vi phạm.");

    try {
      const now = new Date();
      const timePart = now.toTimeString().split(" ")[0];
      const isoDatetime = new Date(`${date}T${timePart}`).toISOString();

      const payload = {
        className,
        violation,
        studentName: selectedStudents.join(", "),
        recorder,
        date: isoDatetime,
        note, // ✅ thêm ghi chú
      };

      await api.post("/api/class-lineup-summaries", payload);
      setViolation("");
      setStudentInput("");
      setSelectedStudents([]);
      setNote("");
      await loadRecords(selectedWeek || undefined);
    } catch (err) {
      console.error("Lỗi khi lưu ghi nhận:", err);
      alert("Lưu thất bại. Xem console để biết chi tiết.");
    }
  };

  // --- Xóa bản ghi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      await loadRecords(selectedWeek || undefined);
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Không thể xóa bản ghi.");
    }
  };

  // debug nhỏ — mở console xem
  useEffect(() => {
    console.log("weeks:", weeks, "currentWeek:", currentWeek, "selectedWeek:", selectedWeek);
  }, [weeks, currentWeek, selectedWeek]);

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2} fontWeight="bold">
        Ghi nhận lỗi xếp hàng
      </Typography>

      {/* Form ghi nhận */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Lớp"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setSelectedStudents([]);
            }}
            fullWidth
          >
            <MenuItem value="">-- Chọn lớp --</MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
            fullWidth
          >
            <MenuItem value="">-- Chọn lỗi --</MenuItem>
            {violationOptions.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ position: "relative" }}>
            <TextField
              fullWidth
              label="Học sinh vi phạm (nhập để gợi ý)"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder={className ? "Nhập tên học sinh..." : "Chọn lớp trước để gợi ý học sinh"}
              disabled={!className}
            />
            {suggestions.length > 0 && (
              <Paper
                sx={{
                  position: "absolute",
                  zIndex: 50,
                  mt: 0.5,
                  left: 0,
                  right: 0,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {suggestions.map((s) => (
                  <MenuItem key={s._id} onClick={() => handleSelectSuggestion(s)}>
                    {s.name} {s.className ? `(${s.className})` : ""}
                  </MenuItem>
                ))}
              </Paper>
            )}
          </Box>

          {selectedStudents.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedStudents.map((s) => (
                <Chip key={s} label={s} onDelete={() => removeSelectedStudent(s)} sx={{ mt: 0.5 }} />
              ))}
            </Stack>
          )}
          <TextField
            label="Ngày ghi nhận"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={handleSave}>
              Lưu ghi nhận
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setViolation("");
                setStudentInput("");
                setSelectedStudents([]);
                setClassName("");
              }}
            >
              Reset
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Bộ lọc tuần */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Danh sách lớp đã ghi nhận vi phạm</Typography>

        {/* FormControl để Select hiện rõ, không bị "ẩn" */}
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="week-select-label">Chọn tuần</InputLabel>
          <Select
            labelId="week-select-label"
            label="Chọn tuần"
            value={selectedWeek}
            onChange={handleWeekChange}
            displayEmpty
          >
            <MenuItem value="">
              {currentWeek ? `Tuần ${currentWeek} (hiện tại)` : "Tuần hiện tại"}
            </MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber}
                {currentWeek === w.weekNumber ? " (hiện tại)" : ""} —{" "}
                {dayjs(w.startDate).format("DD/MM")} → {dayjs(w.endDate).format("DD/MM")}
              </MenuItem>
            ))}
            {weeks.length === 0 && <MenuItem disabled>Không có tuần được khai báo</MenuItem>}
          </Select>
        </FormControl>
      </Box>

      {/* Bảng dữ liệu */}
<TableContainer
  component={Paper}
  sx={{
    width: "100%",
    overflowX: "auto",
    boxShadow: 2,
    borderRadius: 2,
  }}
>
  <Table
    size="small"
    sx={{
      minWidth: 700,
      "& th": { bgcolor: "primary.main", color: "white", whiteSpace: "nowrap" },
      "& td": { whiteSpace: "nowrap", fontSize: { xs: "0.85rem", sm: "0.95rem" } },
    }}
  >
    <TableHead>
      <TableRow>
        
        <TableCell>Lớp</TableCell>
        <TableCell>Lỗi vi phạm</TableCell>
        <TableCell>Học sinh vi phạm</TableCell>
        <TableCell>Thời gian ghi nhận</TableCell>
        <TableCell align="center">Điểm trừ</TableCell>
        <TableCell>Ghi chú</TableCell>
        <TableCell align="center">Thao tác</TableCell>
      </TableRow>
    </TableHead>

    <TableBody>
      {loading ? (
        <TableRow>
          <TableCell colSpan={9} align="center">
            Đang tải...
          </TableCell>
        </TableRow>
      ) : records.length === 0 ? (
        <TableRow>
          <TableCell colSpan={9} align="center">
            Không có dữ liệu
          </TableCell>
        </TableRow>
      ) : (
        records.map((r) => (
          <TableRow
            key={r._id}
            hover
            sx={{
              "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
            }}
          >
            
            <TableCell>{r.className}</TableCell>
            <TableCell>{r.violation}</TableCell>
            <TableCell>{r.studentName || "-"}</TableCell>
            <TableCell>
              {new Date(r.date).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell align="center" sx={{ color: "red", fontWeight: 600 }}>
              -{Math.abs(r.scoreChange ?? 10)}
            </TableCell>
            <TableCell sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.note || "-"}
            </TableCell>
            <TableCell align="center">
              <IconButton color="error" onClick={() => handleDelete(r._id)}>
                <CloseIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
</TableContainer>

    </Box>
  );
}
