import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import api from "../../api/api";

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  week: number;
  time: string;
}

interface GroupedStudent {
  name: string;
  className: string;
  violations: Violation[];
}

const removeVietnameseTones = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

export default function UnhandledViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [grouped, setGrouped] = useState<GroupedStudent[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [weekOptions, setWeekOptions] = useState<number[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [searchName, setSearchName] = useState("");
  const [onlyFrequent, setOnlyFrequent] = useState(false);

  // load dữ liệu violations
  useEffect(() => {
    api
      .get("/api/violations")
      .then((res) => {
        setViolations(res.data);

        const classes = Array.from(new Set(res.data.map((v: Violation) => v.className)));
        setClassOptions(classes);

        const weeks = Array.from(new Set(res.data.map((v: Violation) => v.week))).sort((a, b) => a - b);
        setWeekOptions(weeks);
      })
      .catch((err) => console.error("Lỗi load vi phạm:", err));
  }, []);

  // Gom nhóm theo học sinh
  useEffect(() => {
    const map: { [key: string]: GroupedStudent } = {};
    violations.forEach((v) => {
      const key = v.name.trim().toLowerCase() + "_" + v.className;
      if (!map[key]) {
        map[key] = { name: v.name, className: v.className, violations: [v] };
      } else {
        map[key].violations.push(v);
      }
    });
    setGrouped(Object.values(map));
  }, [violations]);

  // Lọc kết quả
  const filtered = grouped.filter((g) => {
    // Lọc theo lớp
    if (selectedClass !== "all" && g.className !== selectedClass) return false;

    // Lọc theo tuần
    let violationsByWeek = g.violations;
    if (selectedWeek !== "all") {
      const weekNum = parseInt(selectedWeek);
      violationsByWeek = g.violations.filter((v) => v.week === weekNum);
      if (violationsByWeek.length === 0) return false;
    }

    // Lọc theo tên
    if (searchName.trim()) {
      const search = removeVietnameseTones(searchName);
      if (!removeVietnameseTones(g.name).includes(search)) return false;
    }

    // Lọc theo checkbox ">= 3 vi phạm"
    if (onlyFrequent && violationsByWeek.length < 3) return false;

    return true;
  });

  return (
    <Box sx={{ width: "90%", mx: "auto", py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Danh sách học sinh vi phạm
      </Typography>

      {/* Bộ lọc */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Tìm theo tên học sinh"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          fullWidth
        />

        <TextField
          select
          label="Chọn lớp"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Tất cả lớp</MenuItem>
          {classOptions.map((cls) => (
            <MenuItem key={cls} value={cls}>
              {cls}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Tất cả tuần</MenuItem>
          {weekOptions.map((w) => (
            <MenuItem key={w} value={w.toString()}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* Checkbox lọc học sinh vi phạm >= 3 lần */}
      <FormControlLabel
        control={
          <Checkbox
            checked={onlyFrequent}
            onChange={(e) => setOnlyFrequent(e.target.checked)}
          />
        }
        label="Chỉ hiển thị học sinh vi phạm từ 3 lần trở lên"
      />

      {/* Danh sách */}
      {filtered.length === 0 ? (
        <Typography align="center" sx={{ mt: 3 }}>
          Không có dữ liệu
        </Typography>
      ) : (
        <List>
          {filtered.map((g, idx) => (
            <Paper key={idx} sx={{ mb: 2, p: 2 }}>
              <Typography variant="h6">
                {g.name} — {g.className} ({g.violations.length} lần vi phạm)
              </Typography>
              <Divider sx={{ my: 1 }} />
              <List dense>
                {g.violations.map((v) => (
                  <ListItem key={v._id}>
                    <ListItemText
                      primary={`- ${v.description}`}
                      secondary={`Tuần ${v.week} — ${new Date(v.time).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );
}
