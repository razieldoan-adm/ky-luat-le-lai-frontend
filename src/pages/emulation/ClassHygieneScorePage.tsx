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
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import api from "../../api/api";

interface ClassData {
  _id: string;
  name: string;
  grade: string;
}

interface HygieneRecord {
  _id?: string;
  classId: string;
  weekNumber: number;
  date: string; // ISO date
  absentDuty: number;
  noLightFan: number;
  notClosedDoor: number;
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

const days = [
  { key: "Mon", label: "Thứ 2" },
  { key: "Tue", label: "Thứ 3" },
  { key: "Wed", label: "Thứ 4" },
  { key: "Thu", label: "Thứ 5" },
  { key: "Fri", label: "Thứ 6" },
];

export default function ClassHygieneScorePage() {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [scores, setScores] = useState<Record<string, HygieneRecord>>({});
  const [loading, setLoading] = useState(false);

  // Load tuần học
  useEffect(() => {
    api.get("/academic-weeks").then((res) => setWeeks(res.data));
  }, []);

  // Load danh sách lớp
  useEffect(() => {
    api.get("/classes").then((res) => setClasses(res.data));
  }, []);

  // Load dữ liệu khi chọn tuần
  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    api
      .get(`/class-hygiene-scores/by-week?weekNumber=${selectedWeek}`)
      .then((res) => {
        const records: HygieneRecord[] = res.data;
        const map: Record<string, HygieneRecord> = {};
        records.forEach((r) => {
          const key = `${r.classId}_${r.date}`;
          map[key] = r;
        });
        setScores(map);
      })
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  // Xử lý thay đổi input
  const handleChange = (
    classId: string,
    date: string,
    field: keyof HygieneRecord,
    value: string
  ) => {
    const key = `${classId}_${date}`;
    const prev = scores[key] || {
      classId,
      date,
      weekNumber: selectedWeek as number,
      absentDuty: 0,
      noLightFan: 0,
      notClosedDoor: 0,
    };
    setScores({
      ...scores,
      [key]: { ...prev, [field]: Number(value) },
    });
  };

  // Lưu dữ liệu
  const handleSave = async () => {
    const payload = Object.values(scores);
    await api.post("/class-hygiene-scores/save", payload);
    alert("Lưu thành công!");
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Quản lý điểm vệ sinh lớp
      </Typography>

      {/* Chọn tuần */}
      <Box mb={2}>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value as number)}
          displayEmpty
          size="small"
        >
          <MenuItem value="">Chọn tuần</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w.weekNumber}>
              Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        selectedWeek && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lớp</TableCell>
                  {days.map((d) => (
                    <TableCell key={d.key} align="center">
                      {d.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls._id}>
                    <TableCell>
                      {cls.grade} - {cls.name}
                    </TableCell>
                    {days.map((d, idx) => {
                      // Tính ngày (giả định startDate là thứ 2)
                      const week = weeks.find(
                        (w) => w.weekNumber === selectedWeek
                      );
                      if (!week) return null;
                      const start = new Date(week.startDate);
                      const date = new Date(start);
                      date.setDate(start.getDate() + idx);
                      const dateStr = date.toISOString().split("T")[0];

                      const key = `${cls._id}_${dateStr}`;
                      const record = scores[key] || {
                        classId: cls._id,
                        weekNumber: selectedWeek as number,
                        date: dateStr,
                        absentDuty: 0,
                        noLightFan: 0,
                        notClosedDoor: 0,
                      };

                      return (
                        <TableCell key={d.key}>
                          <Box display="flex" flexDirection="column" gap={1}>
                            <TextField
                              type="number"
                              label="Vắng trực"
                              size="small"
                              value={record.absentDuty}
                              onChange={(e) =>
                                handleChange(
                                  cls._id,
                                  dateStr,
                                  "absentDuty",
                                  e.target.value
                                )
                              }
                            />
                            <TextField
                              type="number"
                              label="Không quạt/đèn"
                              size="small"
                              value={record.noLightFan}
                              onChange={(e) =>
                                handleChange(
                                  cls._id,
                                  dateStr,
                                  "noLightFan",
                                  e.target.value
                                )
                              }
                            />
                            <TextField
                              type="number"
                              label="Không đóng cửa"
                              size="small"
                              value={record.notClosedDoor}
                              onChange={(e) =>
                                handleChange(
                                  cls._id,
                                  dateStr,
                                  "notClosedDoor",
                                  e.target.value
                                )
                              }
                            />
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      {selectedWeek && (
        <Box mt={2}>
          <Button variant="contained" onClick={handleSave}>
            Lưu dữ liệu
          </Button>
        </Box>
      )}
    </Box>
  );
}
