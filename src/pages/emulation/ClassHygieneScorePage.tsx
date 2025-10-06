
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  MenuItem,
  Select,
  Paper,
  CircularProgress,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface ClassInfo {
  _id: string;
  name: string;
  grade: number;
}

interface HygieneRecord {
  classId: string;
  weekId: string;
  day: string;
  morning: { absentDuty: boolean; noLightFan: boolean; notClosedDoor: boolean };
  afternoon: { absentDuty: boolean; noLightFan: boolean; notClosedDoor: boolean };
  totalScore: number;
}

const ClassHygieneScorePage = () => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [weeks, setWeeks] = useState<{ _id: string; weekNumber: number }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [scores, setScores] = useState<Record<string, HygieneRecord[]>>({});

  const days = ["Thứ 6", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5"];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [classRes, weekRes] = await Promise.all([
          api.get("/classes"),
          api.get("/weeks"),
        ]);
        setClasses(classRes.data);
        setWeeks(weekRes.data);
      } catch (err) {
        console.error("Error fetching:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredClasses =
    selectedGrade === "all"
      ? classes
      : classes.filter((cls) => cls.grade === parseInt(selectedGrade));

  const handleCheckboxChange = (
    classId: string,
    day: string,
    session: "morning" | "afternoon",
    field: "absentDuty" | "noLightFan" | "notClosedDoor"
  ) => {
    setScores((prev) => {
      const currentRecords = prev[classId] || [];
      const recordIndex = currentRecords.findIndex((r) => r.day === day);
      let updatedRecords = [...currentRecords];

      if (recordIndex === -1) {
        updatedRecords.push({
          classId,
          weekId: selectedWeek,
          day,
          morning: { absentDuty: false, noLightFan: false, notClosedDoor: false },
          afternoon: { absentDuty: false, noLightFan: false, notClosedDoor: false },
          totalScore: 0,
        });
      }

      const record =
        updatedRecords[recordIndex !== -1 ? recordIndex : updatedRecords.length - 1];
      const updatedSession = { ...record[session], [field]: !record[session][field] };
      record[session] = updatedSession;

      const totalChecked =
        Object.values(record.morning).filter(Boolean).length +
        Object.values(record.afternoon).filter(Boolean).length;
      record.totalScore = totalChecked * 10;

      updatedRecords[recordIndex !== -1 ? recordIndex : updatedRecords.length - 1] = record;
      return { ...prev, [classId]: updatedRecords };
    });
  };

  const handleSave = async () => {
    if (!selectedWeek) return alert("Vui lòng chọn tuần");
    try {
      setLoading(true);
      const allRecords = Object.values(scores).flat();
      await api.post("/class-hygiene-scores", allRecords);
      alert("Đã lưu điểm vệ sinh thành công!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Điểm vệ sinh lớp học
      </Typography>
      <Stack direction="row" spacing={2} mb={2}>
        <Select
          size="small"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">Chọn tuần</MenuItem>
          {weeks.map((w) => (
            <MenuItem key={w._id} value={w._id}>
              Tuần {w.weekNumber}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          displayEmpty
        >
          <MenuItem value="all">Tất cả khối</MenuItem>
          {[6, 7, 8, 9].map((grade) => (
            <MenuItem key={grade} value={grade.toString()}>
              Khối {grade}
            </MenuItem>
          ))}
        </Select>
        <Button variant="contained" onClick={handleSave}>
          Lưu điểm
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Lớp</TableCell>
              {days.map((day) => (
                <TableCell align="center" key={day}>
                  {day}
                </TableCell>
              ))}
              <TableCell align="center">Tổng</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClasses.map((cls) => {
              const classRecords = scores[cls._id] || [];
              const total = classRecords.reduce(
                (sum, rec) => sum + (rec.totalScore || 0),
                0
              );

              return (
                <TableRow key={cls._id}>
                  <TableCell>{cls.name}</TableCell>
                  {days.map((day) => {
                    const record =
                      classRecords.find((r) => r.day === day) ||
                      ({
                        morning: { absentDuty: false, noLightFan: false, notClosedDoor: false },
                        afternoon: { absentDuty: false, noLightFan: false, notClosedDoor: false },
                      } as HygieneRecord);

                    return (
                      <TableCell key={day} align="center">
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          <Box display="flex" justifyContent="center" gap={0.5}>
                            {["absentDuty", "noLightFan", "notClosedDoor"].map((f) => (
                              <Checkbox
                                key={f}
                                size="small"
                                checked={record.morning[f as keyof typeof record.morning]}
                                onChange={() =>
                                  handleCheckboxChange(
                                    cls._id,
                                    day,
                                    "morning",
                                    f as keyof typeof record.morning
                                  )
                                }
                              />
                            ))}
                          </Box>
                          <Box display="flex" justifyContent="center" gap={0.5}>
                            {["absentDuty", "noLightFan", "notClosedDoor"].map((f) => (
                              <Checkbox
                                key={f}
                                size="small"
                                checked={record.afternoon[f as keyof typeof record.afternoon]}
                                onChange={() =>
                                  handleCheckboxChange(
                                    cls._id,
                                    day,
                                    "afternoon",
                                    f as keyof typeof record.afternoon
                                  )
                                }
                              />
                            ))}
                          </Box>
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {total}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ClassHygieneScorePage;

