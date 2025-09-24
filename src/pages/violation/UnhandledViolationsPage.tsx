import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api/api";

interface StudentViolation {
  _id: string;
  studentName: string;
  className: string;
  violations: {
    description: string;
    time: string;
    handlingMethod?: string;
    points: number;
  }[];
}

interface WeekSetting {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

const UnhandledViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<StudentViolation[]>([]);
  const [filteredData, setFilteredData] = useState<StudentViolation[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [onlyThreePlus, setOnlyThreePlus] = useState(false);
  const [weekList, setWeekList] = useState<WeekSetting[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | number>("all");

  // lấy vi phạm
  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations/unhandled");
      setViolations(res.data);
      setFilteredData(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách vi phạm:", err);
    }
  };

  // lấy danh sách lớp
  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClassList(res.data.map((c: any) => c.name));
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  // lấy tuần từ setting
  const fetchWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeekList(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách tuần:", err);
    }
  };

  useEffect(() => {
    fetchViolations();
    fetchClasses();
    fetchWeeks();
  }, []);

  // áp dụng bộ lọc
  const applyFilter = () => {
    let data = [...violations];

    // lọc theo lớp
    if (selectedClasses.length > 0) {
      data = data.filter((v) => selectedClasses.includes(v.className));
    }

    // lọc theo tên
    if (studentName.trim() !== "") {
      data = data.filter((v) =>
        v.studentName.toLowerCase().includes(studentName.toLowerCase())
      );
    }

    // lọc theo số lần vi phạm >= 3
    if (onlyThreePlus) {
      data = data.filter((v) => v.violations.length >= 3);
    }

    // lọc theo tuần
    if (selectedWeek !== "all") {
      data = data.map((v) => ({
        ...v,
        violations: v.violations.filter(
          (violation) =>
            new Date(violation.time) >=
              new Date(
                weekList.find((w) => w.weekNumber === selectedWeek)?.startDate ||
                  ""
              ) &&
            new Date(violation.time) <=
              new Date(
                weekList.find((w) => w.weekNumber === selectedWeek)?.endDate ||
                  ""
              )
        ),
      }));
      data = data.filter((v) => v.violations.length > 0);
    }

    setFilteredData(data);
  };

  const clearFilter = () => {
    setSelectedClasses([]);
    setStudentName("");
    setOnlyThreePlus(false);
    setSelectedWeek("all");
    setFilteredData(violations);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Học sinh vi phạm (báo cáo)
      </Typography>

      {/* Bộ lọc */}
      <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
        {/* chọn lớp multiple checkbox */}
        <TextField
          select
          label="Chọn lớp"
          value={selectedClasses}
          onChange={(e) =>
            setSelectedClasses(
              typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value
            )
          }
          SelectProps={{
            multiple: true,
            renderValue: (selected) => {
              if ((selected as string[]).length === 0) {
                return "Tất cả lớp";
              }
              return (selected as string[]).join(", ");
            },
          }}
          sx={{ minWidth: 200 }}
        >
          {classList.map((cls) => (
            <MenuItem key={cls} value={cls}>
              <Checkbox checked={selectedClasses.indexOf(cls) > -1} />
              <ListItemText primary={cls} />
            </MenuItem>
          ))}
        </TextField>

        {/* tìm theo tên */}
        <TextField
          label="Tìm theo tên học sinh"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
        />

        {/* lọc theo tuần */}
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
            <MenuItem key={w.weekNumber} value={w.weekNumber}>
              Tuần {w.weekNumber} ({new Date(w.startDate).toLocaleDateString()} -{" "}
              {new Date(w.endDate).toLocaleDateString()})
            </MenuItem>
          ))}
        </TextField>

        {/* chỉ học sinh >= 3 vi phạm */}
        <Box display="flex" alignItems="center">
          <Checkbox
            checked={onlyThreePlus}
            onChange={(e) => setOnlyThreePlus(e.target.checked)}
          />
          <Typography variant="body2">Chỉ học sinh ≥ 3 vi phạm</Typography>
        </Box>

        <Button variant="contained" onClick={applyFilter}>
          ÁP DỤNG
        </Button>
        <Button variant="outlined" onClick={clearFilter}>
          XÓA LỌC
        </Button>
      </Box>

      {/* bảng kết quả */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#90caf9" }}>
            <th>STT</th>
            <th>Họ tên</th>
            <th>Lớp</th>
            <th>Lỗi vi phạm</th>
            <th>Thời gian</th>
            <th>Hình thức xử lý</th>
            <th>Điểm</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                Không có dữ liệu phù hợp.
              </td>
            </tr>
          ) : (
            filteredData.map((student, idx) => (
              <tr key={student._id}>
                <td>{idx + 1}</td>
                <td>{student.studentName}</td>
                <td>{student.className}</td>
                <td>
                  {student.violations.map((v, i) => (
                    <div key={i}>{v.description}</div>
                  ))}
                </td>
                <td>
                  {student.violations.map((v, i) => (
                    <div key={i}>
                      {new Date(v.time).toLocaleString("vi-VN")}
                    </div>
                  ))}
                </td>
                <td>
                  {student.violations.map((v, i) => (
                    <div key={i}>{v.handlingMethod || "-"}</div>
                  ))}
                </td>
                <td>
                  {student.violations.map((v, i) => (
                    <div key={i}>{v.points}</div>
                  ))}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Box>
  );
};

export default UnhandledViolationsPage;
