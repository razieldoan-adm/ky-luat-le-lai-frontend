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
  IconButton,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
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

export default function EarlyLeaveListPage() {
  const [filterClass, setFilterClass] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  useEffect(() => {
    api
      .get("/api/classes/with-teacher")
      .then((res) => setClassOptions(res.data));
  }, []);

  useEffect(() => {
    if (!filterClass) return;

    api
      .get("/api/early-leave/students/by-class", {
        params: { className: filterClass },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
  }, [filterClass]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa học sinh này?")) return;

    await api.delete(`/api/early-leave/students/${id}`);

    const res = await api.get(
      "/api/early-leave/students/by-class",
      { params: { className: filterClass } }
    );
    setStudents(res.data);
  };

  return (
    <Box sx={{ width: "60vw", mx: "auto", mt: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Danh sách học sinh ra về
      </Typography>

      <Stack spacing={2}>
        <TextField
          select
          label="Chọn lớp"
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
        >
          <MenuItem value="">-- Chọn lớp --</MenuItem>
          {classOptions.map((cls) => (
            <MenuItem key={cls._id} value={cls.className}>
              {cls.className} — {cls.teacher}
            </MenuItem>
          ))}
        </TextField>

        <Paper>
          <List>
            {students.map((s, i) => (
              <ListItem
                key={s._id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleDelete(s._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${i + 1}. ${s.name}`}
                  secondary={`Lớp: ${s.className}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
