import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  MenuItem,
} from "@mui/material";
import dayjs from "dayjs";
import api from "../../api/api";
import useAcademicWeeks from "../../types/useAcademicWeeks"; // ✅ Hook dùng chung

interface SummaryRow {
  id: number;
  className: string;
  count: number;
  total: number;
}

export default function ClassLineUpSummaryPage() {
  const { weeks, currentWeek } = useAcademicWeeks();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(10);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);

  // ✅ Gán mặc định tuần hiện tại khi có dữ liệu
  useEffect(() => {
    console.log("📅 Weeks list:", weeks);
    console.log("📅 Current week:", currentWeek);
    if (currentWeek && weeks.length > 0) {
      setSelectedWeek(String(currentWeek)); // luôn dùng chuỗi để đồng nhất
    }
  }, [currentWeek, weeks]);

  // ✅ Hàm tìm tuần robust hơn
  const findWeekObj = () => {
    const weekObj = weeks.find(
      (w) =>
        String(w.weekNumber) === String(selectedWeek) ||
        String(w._id) === String(selectedWeek)
    );

    console.log("🔎 selectedWeek:", selectedWeek);
    console.log("🔎 Found weekObj:", weekObj);

    return weekObj;
  };

  // 🔹 Load dữ liệu lineup theo tuần được chọn
  const handleLoadData = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần!");

      const weekObj = findWeekObj();
      if (!weekObj) return alert("Không tìm thấy tuần!");

      // 1️⃣ Lấy toàn bộ lớp
      const classRes = await api.get("/api/classes");
      const allClasses = classRes.data?.classes || classRes.data || [];

      if (!Array.isArray(allClasses) || allClasses.length === 0) {
        alert("⚠️ Không có dữ liệu lớp nào!");
        return;
      }

      // 2️⃣ Lấy dữ liệu lineup trong tuần
      const res = await api.get("/api/class-lineup-summaries/weekly", {
        params: { weekNumber: Number(weekObj.weekNumber) },
      });

      const data = Array.isArray(res.data?.records)
        ? res.data.records
        : Array.isArray(res.data)
        ? res.data
        : [];

      console.log("📊 Dữ liệu lineup tuần:", data);

      if (data.length === 0) {
        console.warn(`⚠️ Không có dữ liệu lineup cho tuần ${weekObj.weekNumber}`);
      }

      // 3️⃣ Gom nhóm số lần vi phạm theo lớp
      const grouped: Record<string, number> = {};
      if (data.length > 0) {
        data.forEach((item: any) => {
          if (!grouped[item.className]) grouped[item.className] = 0;
          grouped[item.className]++;
        });
      }

      // 4️⃣ Kết hợp toàn bộ lớp — lớp nào không vi phạm → count = 0
      const formatted = allClasses.map((cls: any, index: number) => {
        const className = cls.name || cls.className || `Lớp ${index + 1}`;
        const count = grouped[className] || 0;

        return {
          id: index + 1,
          className,
          count,
          total: count * multiplier,
        };
      });

      setSummaries(formatted);
    } catch (err) {
      console.error("❌ Lỗi load lineup:", err);
      alert("Không thể tải dữ liệu lineup của tuần!");
    }
  };

  // 🔹 Lưu điểm tổng vào ClassWeeklyScore
  const handleSave = async () => {
    try {
      if (!selectedWeek) return alert("Vui lòng chọn tuần trước khi lưu!");
      const weekObj = findWeekObj();
      if (!weekObj) return alert("Không tìm thấy tuần!");

      for (const s of summaries) {
        await api.post("/api/class-lineup-summaries/update-weekly-score", {
          className: s.className,
          weekNumber: Number(weekObj.weekNumber), // ép kiểu sang số
          lineUpScore: s.total,
        });
      }

      alert("✅ Đã lưu điểm lineup của tất cả lớp!");
    } catch (err) {
      console.error("❌ Lỗi khi lưu điểm lineup:", err);
      alert("❌ Lưu thất bại!");
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Tổng điểm xếp hàng các lớp theo tuần
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        {/* ✅ Sửa value để dùng weekNumber nhất quán */}
        <TextField
          select
          label="Chọn tuần"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w._id} value={String(w.weekNumber)}>
              Tuần {w.weekNumber}
              {w.weekNumber === currentWeek ? " (Tuần hiện tại)" : ""}{" "}
              ({dayjs(w.startDate).format("DD/MM")} - {dayjs(w.endDate).format("DD/MM")})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Hệ số điểm"
          type="number"
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          sx={{ width: 120 }}
        />

        <Button variant="contained" onClick={handleLoadData}>
          LOAD DỮ LIỆU
        </Button>
        <Button variant="contained" color="success" onClick={handleSave}>
          LƯU
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Số lần vi phạm</TableCell>
              <TableCell>Hệ số</TableCell>
              <TableCell>Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.className}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{multiplier}</TableCell>
                <TableCell>{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
