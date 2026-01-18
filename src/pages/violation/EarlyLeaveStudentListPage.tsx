import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  MenuItem,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import api from "../../api/api";

interface Student {
  _id: string;
  name: string;
  className: string;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

export default function EarlyLeaveStudentListPage() {
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  // 📌 load danh sách lớp
  useEffect(() => {
    api
      .get("/api/classes/with-teacher")
      .then((res) => setClassOptions(res.data))
      .catch(console.error);
  }, []);

  // 📌 load DS học sinh theo lớp
  useEffect(() => {
    if (!className) {
      setStudents([]);
      return;
    }

    api
      .get(`/api/early-leave/by-class?className=${className}`)
      .then((res) => setStudents(res.data))
      .catch(console.error);
  }, [className]);

  return (
    <Box sx={{ width: "75vw", py: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Danh sách học sinh xin ra về sớm
      </Typography>

      <Stack spacing={3}>
        {/* 🔽 chọn lớp */}
        <TextField
          label="Chọn lớp"
          select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        >
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className} — {cls.teacher}
            </MenuItem>
          ))}
        </TextField>

        {/* 📋 danh sách */}
        {students.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Danh sách học sinh ({students.length})
            </Typography>

            <List>
              {students.map((s, index) => (
                <ListItem key={s._id} divider>
                  <ListItemText
                    primary={`${index + 1}. ${s.name}`}
                    secondary={`Lớp: ${s.className}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {className && students.length === 0 && (
          <Typography align="center" color="text.secondary">
            Chưa có học sinh nào trong danh sách lớp này
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
