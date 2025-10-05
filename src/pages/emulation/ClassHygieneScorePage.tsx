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
  Paper,
  Checkbox,
  Typography,
} from "@mui/material";
import api from "../../api/api";

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface ClassOption {
  _id: string;
  name: string;
}

interface RowData {
  classId: string;
  className: string;
  scores: { [criteria: string]: boolean };
}

const hygieneCriteria = ["Sạch sẽ", "Trang trí", "Nề nếp", "Khác"];

const ClassHygieneScorePage = () => {
  const [loading, setLoading] = useState(false);
  const [weekList, setWeekList] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<AcademicWeek | null>(null);
  const [classList, setClassList] = useState<ClassOption[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);

  // Lấy danh sách tuần + mặc định tuần hiện tại
  useEffect(() => {
    const fetchWeeksAndClasses = async () => {
      try {
        setLoading(true);
        const [weeksRes, classesRes] = await Promise.all([
          api.get("/api/academic-weeks"),
          api.get("/api/classes"),
        ]);
        const wk = weeksRes?.data || [];
        setWeekList(wk);

        const cls = classesRes?.data || [];
        setClassList(cls);

        if (wk.length > 0) {
          const today = new Date();
          const current =
            wk.find(
              (w: AcademicWeek) =>
                new Date(w.startDate) <= today && today <= new Date(w.endDate)
            ) || wk[0];
          setSelectedWeek(current);
          await initializeData(current.weekNumber, cls);
        }
      } catch (error) {
        console.error("Error fetching weeks/classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeksAndClasses();
  }, []);

  // Hàm khởi tạo / reload dữ liệu từ DB
  const initializeData = async (
    weekNumber?: number,
    classes: ClassOption[] = classList
  ) => {
    if (!weekNumber) return;
    try {
      const res = await api.get("/api/class-hygiene-scores/by-week", {
        params: { weekNumber },
      });
      const dbScores = res.data;

      const formatted = classes.map((cls) => {
        const found = dbScores.find((s: any) => s.classId === cls._id);
        return {
          classId: cls._id,
          className: cls.name,
          scores: found?.scores || {},
        };
      });
      setRows(formatted);
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };

  const handleCheckChange = (
    classId: string,
    criteria: string,
    checked: boolean
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.classId === classId
          ? {
              ...row,
              scores: {
                ...row.scores,
                [criteria]: checked,
              },
            }
          : row
      )
    );
  };

  const handleSave = async () => {
    if (!selectedWeek) return;
    try {
      setLoading(true);
      await api.post("/api/class-hygiene-scores/save", {
        weekNumber: selectedWeek.weekNumber,
        scores: rows,
      });
      // Reload lại dữ liệu từ DB sau khi lưu
      await initializeData(selectedWeek.weekNumber, classList);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Nhập điểm vệ sinh lớp
      </Typography>

      <Select
        value={selectedWeek?._id || ""}
        onChange={async (e) => {
          const selected = weekList.find((w) => w._id === e.target.value) || null;
          setSelectedWeek(selected);
          if (selected) {
            await initializeData(selected.weekNumber, classList);
          }
        }}
        sx={{ mb: 2, minWidth: 200 }}
      >
        {weekList.map((w) => {
          const today = new Date();
          let status = "";
          if (new Date(w.endDate) < today) status = " (đã qua)";
          else if (new Date(w.startDate) > today) status = " (chưa diễn ra)";
          else status = " (hiện tại)";

          return (
            <MenuItem
              key={w._id}
              value={w._id}
              disabled={new Date(w.startDate) > today}
            >
              Tuần {w.weekNumber}
              {status}
            </MenuItem>
          );
        })}
      </Select>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: 13, padding: "4px 8px" }}>Lớp</TableCell>
              {hygieneCriteria.map((criteria) => (
                <TableCell
                  key={criteria}
                  align="center"
                  sx={{ fontSize: 13, padding: "4px 8px" }}
                >
                  {criteria}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.classId}>
                <TableCell sx={{ fontSize: 13, padding: "4px 8px" }}>
                  {row.className}
                </TableCell>
                {hygieneCriteria.map((criteria) => (
                  <TableCell key={criteria} align="center" sx={{ padding: "2px" }}>
                    <Checkbox
                      size="small"
                      checked={row.scores[criteria] || false}
                      onChange={(e) =>
                        handleCheckChange(row.classId, criteria, e.target.checked)
                      }
                      sx={{ padding: "2px" }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleSave}
      >
        Lưu
      </Button>
    </Box>
  );
};

export default ClassHygieneScorePage;
