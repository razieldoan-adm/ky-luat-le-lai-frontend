import { useState, useEffect } from "react";
import {
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import api from "../../api/api";   // ✅ dùng api instance của bạn

export default function StudentListPage() {
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes/with-teacher"); // ✅ instance api đã tự có prefix /api
        console.log("Classes:", res.data); // log thử dữ liệu
        setClassOptions(res.data || []);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp:", err);
      }
    };
    fetchClasses();
  }, []);

  return (
    <Box>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="class-label">Lớp</InputLabel>
        <Select
          labelId="class-label"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          {classOptions.map((c) => (
            <MenuItem key={c._id} value={c.name}>
              {c.name} {c.teacher && `- GVCN: ${c.teacher}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        sx={{ ml: 2 }}
        onClick={() => console.log("Load danh sách lớp:", selectedClass)}
      >
        LOAD DANH SÁCH
      </Button>
    </Box>
  );
}
