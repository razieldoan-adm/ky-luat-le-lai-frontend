```tsx
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

interface ClassData {
  _id: string;
  name: string;
  teacher?: string;
}

interface LineUpRecord {
  classId: string;
  week: string;
  errors: { [key: string]: number };
}

const errorTypes: string[] = [
  "1. Lớp xếp hàng chậm",
  "2. Nhiều hs ngồi trong lớp giờ chơi, không ra xếp hàng",
  "5. Mất trật tự trong khi xếp hàng giờ SHDC",
  "6. Ồn ào, đùa giỡn khi di chuyển lên lớp",
];

export default function ClassLineUpSummaryPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [records, setRecords] = useState<LineUpRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [weeks, setWeeks] = useState<string[]>([]);
  const [existingWeeks, setExistingWeeks] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [classRes, recordRes, weekRes] = await Promise.all([
        api.get("/classes"),
        api.get("/lineup-records"),
        api.get("/lineup-records/weeks"),
      ]);

      // chỉ lấy lớp có GVCN
      const filteredClasses = classRes.data.filter((c: ClassData) => c.teacher);

      setClasses(filteredClasses);
      setRecords(recordRes.data);
      setWeeks(weekRes.data.allWeeks);
      setExistingWeeks(weekRes.data.existingWeeks);

      if (weekRes.data.allWeeks.length > 0) {
        setSelectedWeek(weekRes.data.allWeeks[0]);
      }
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleErrorChange = (
    classId: string,
    errorType: string,
    value: number
  ) => {
    setRecords((prev) => {
      const copy = [...prev];
      let record = copy.find(
        (r) => r.classId === classId && r.week === selectedWeek
      );

      if (!record) {
        record = { classId, week: selectedWeek, errors: {} };
        copy.push(record);
      }

      record.errors[errorType] = value;
      return copy;
    });
  };

  const saveData = async () => {
    try {
      await api.post("/lineup-records/save", {
        week: selectedWeek,
        records: records.filter((r) => r.week === selectedWeek),
      });
      alert("Đã lưu dữ liệu thành công!");
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
      alert("Lưu dữ liệu thất bại!");
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Tổng hợp xếp hàng theo tuần
      </Typography>

      <Box mb={2}>
        <Typography>Chọn tuần:</Typography>
        <Select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          displayEmpty
        >
          {weeks.map((week) => (
            <MenuItem
              key={week}
              value={week}
              disabled={existingWeeks.includes(week)}
              style={{
                color: existingWeeks.includes(week) ? "red" : "inherit",
              }}
            >
              {week}
              {existingWeeks.includes(week) ? " (đã có dữ liệu)" : ""}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lớp</TableCell>
              {errorTypes.map((err) => (
                <TableCell key={err}>{err}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((cls) => {
              const record = records.find(
                (r) => r.classId === cls._id && r.week === selectedWeek
              );
              return (
                <TableRow key={cls._id}>
                  <TableCell>{cls.name}</TableCell>
                  {errorTypes.map((err) => (
                    <TableCell key={err}>
                      <input
                        type="number"
                        min={0}
                        value={record?.errors[err] ?? 0}
                        onChange={(e) =>
                          handleErrorChange(
                            cls._id,
                            err,
                            Number(e.target.value)
                          )
                        }
                        style={{ width: "60px" }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={saveData}
          disabled={!selectedWeek}
        >
          Lưu dữ liệu
        </Button>
      </Box>
    </Box>
  );
}
```
