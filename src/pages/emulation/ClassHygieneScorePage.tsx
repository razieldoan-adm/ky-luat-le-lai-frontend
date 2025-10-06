
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface HygieneSession {
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

interface HygieneRecord {
  classId: string;
  className: string;
  date: string;
  sessions: {
    morning: HygieneSession;
    afternoon: HygieneSession;
  };
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassInfo {
  _id: string;
  name: string;
  grade: string;
}

const VIOLATION_LABELS = [
  { key: "absentDuty", label: "Không trực lớp" },
  { key: "noLightFan", label: "Không tắt đèn/quạt" },
  { key: "notClosedDoor", label: "Không đóng cửa lớp" },
];

export default function ClassHygieneScorePage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<HygieneRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);

  // Lấy danh sách tuần học
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/academic-weeks");
        setWeeks(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWeeks();
  }, []);

  // Lấy danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        setClasses(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  // Khi chọn tuần → tạo mảng ngày (T2–T6)
  useEffect(() => {
    if (selectedWeek === "" || !weeks.length) return;
    const week = weeks.find((w) => w.weekNumber === selectedWeek);
    if (!week) return;

    const start = new Date(week.startDate);
    const newDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      newDates.push(d.toISOString().split("T")[0]);
    }
    setDates(newDates);
  }, [selectedWeek, weeks]);

  // Khi chọn tuần → tải dữ liệu hygiene score
  useEffect(() => {
    if (selectedWeek === "") return;
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/class-hygiene-scores/by-week?weekNumber=${selectedWeek}`);
        const data: HygieneRecord[] = res.data.map((s: any) => ({
          classId: s.classId._id,
          className: s.classId.name,
          date: s.date,
          sessions: s.sessions || { morning: {}, afternoon: {} },
        }));
        setRecords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [selectedWeek]);

  // Hàm đổi checkbox
  const toggleCheckbox = (
    classId: string,
    date: string,
    session: "morning" | "afternoon",
    key: keyof HygieneSession
  ) => {
    setRecords((prev) => {
      const existing = prev.find((r) => r.classId === classId && r.date === date);
      if (existing) {
        return prev.map((r) => {
          if (r.classId === classId && r.date === date) {
            return {
              ...r,
              sessions: {
                ...r.sessions,
                [session]: {
                  ...r.sessions[session],
                  [key]: r.sessions[session]?.[key] ? 0 : 1,
                },
              },
            };
          }
          return r;
        });
      } else {
        const newRec: HygieneRecord = {
          classId,
          className: classes.find((c) => c._id === classId)?.name || "",
          date,
          sessions: {
            morning: { absentDuty: 0, noLightFan: 0, notClosedDoor: 0 },
            afternoon: { absentDuty: 0, noLightFan: 0, notClosedDoor: 0 },
          },
        };
        newRec.sessions[session][key] = 1;
        return [...prev, newRec];
      }
    });
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    if (selectedWeek === "") return alert("Vui lòng chọn tuần!");
    try {
      const payload = {
        weekNumber: selectedWeek,
        scores: records,
      };
      await api.post("/class-hygiene-scores", payload);
      alert("Đã lưu thành công!");
    } catch (err) {
      console.error(err);
      alert("Lưu thất bại.");
    }
  };

  // Lọc lớp theo khối
  const displayedClasses =
    selectedGrade === "all" ? classes : classes.filter((c) => c.name.startsWith(selectedGrade));

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Quản lý điểm vệ sinh lớp học
      </Typography>

      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small">
          <InputLabel>Tuần</InputLabel>
          <Select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            label="Tuần"
            sx={{ minWidth: 120 }}
          >
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Khối</InputLabel>
          <Select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            label="Khối"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="6">Khối 6</MenuItem>
            <MenuItem value="7">Khối 7</MenuItem>
            <MenuItem value="8">Khối 8</MenuItem>
            <MenuItem value="9">Khối 9</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" color="primary" onClick={handleSave}>
          Lưu
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} align="center">
                  Lớp
                </TableCell>
                <TableCell colSpan={dates.length * 2 * 3} align="center">
                  Ngày / Buổi
                </TableCell>
              </TableRow>
              <TableRow>
                {dates.map((d) => (
                  <>
                    <TableCell colSpan={3} align="center" key={`${d}-morning`}>
                      {new Date(d).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                      (S)
                    </TableCell>
                    <TableCell colSpan={3} align="center" key={`${d}-afternoon`}>
                      {new Date(d).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                      (C)
                    </TableCell>
                  </>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {displayedClasses.map((cls) => (
                <TableRow key={cls._id}>
                  <TableCell>{cls.name}</TableCell>
                  {dates.flatMap((d) => [
                    ...["morning", "afternoon"].flatMap((session) =>
                      VIOLATION_LABELS.map((v) => {
                        const record = records.find(
                          (r) => r.classId === cls._id && r.date === d
                        );
                        const checked = record?.sessions?.[session as "morning" | "afternoon"]?.[
                          v.key as keyof HygieneSession
                        ] === 1;
                        return (
                          <TableCell align="center" key={`${cls._id}-${d}-${session}-${v.key}`}>
                            <Checkbox
                              checked={checked}
                              onChange={() =>
                                toggleCheckbox(
                                  cls._id,
                                  d,
                                  session as "morning" | "afternoon",
                                  v.key as keyof HygieneSession
                                )
                              }
                            />
                          </TableCell>
                        );
                      })
                    ),
                  ])}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
