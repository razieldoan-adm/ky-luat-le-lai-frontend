import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import {
  Search,
  AddCircle,
  Edit,
  Delete,
} from "@mui/icons-material";

import api from "../../api/api";

interface AuditLog {
  _id: string;
  userId: string;
  username: string;
  role: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  module: string;
  targetId: string;
  studentName: string;
  className: string;
  academicYear: string;
  weekNumber: number | null;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
  updatedAt: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [weeks, setWeeks] = useState<number[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  
  // ==========================================================
  // TẢI DANH SÁCH TUẦN
  // ==========================================================

  useEffect(() => {
    fetchWeeks();
    fetchClasses();
  }, []);
 
  // ==========================================================
  // LẤY DANH SÁCH TUẦN
  // ==========================================================

const fetchWeeks = async () => {
  try {
    const res = await api.get(
      "/api/academic-weeks/study-weeks"
    );

    const data: any[] = res.data || [];

    const weekNumbers: number[] = data
      .map((week: any) =>
        Number(week.weekNumber)
      )
      .filter(
        (week: number) =>
          !isNaN(week)
      );

    setWeeks(
      [...new Set(weekNumbers)].sort(
        (a: number, b: number) =>
          a - b
      )
    );

    // Tìm tuần hiện tại
    const currentWeek = data.find(
      (week: any) =>
        week.isCurrent === true
    );

    if (currentWeek) {
      setSelectedWeek(
        Number(currentWeek.weekNumber)
      );
    }

  } catch (err) {
    console.error(
      "❌ Lỗi lấy danh sách tuần:",
      err
    );
  }
};
  // ==========================================================
  // KIỂM TRA THAY ĐỔI
  // ==========================================================

  const fetchClasses = async () => {
  try {
    const res = await api.get(
      "/api/classes"
    );

    const data = res.data || [];

    const classNames = data
      .map((item: any) =>
        typeof item === "string"
          ? item
          : item.className
      )
      .filter(
        (name: any): name is string =>
          Boolean(name)
      );

    setClasses(
      [...new Set(classNames)].sort()
    );

  } catch (err) {
    console.error(
      "❌ Lỗi lấy danh sách lớp:",
      err
    );
  }
};
  
  // ==========================================================
  // KIỂM TRA THAY ĐỔI
  // ==========================================================
  
  const checkChanges = async () => {
  if (selectedWeek === "") {
    setError("Vui lòng chọn tuần.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const res = await api.get(
      "/api/audit-logs/violations",
      {
        params: {
          weekNumber: selectedWeek,
          className:
            selectedClass || undefined,
        },
      }
    );

    console.log(
      "🔎 AUDIT FILTER:",
      {
        weekNumber: selectedWeek,
        className: selectedClass || "Tất cả",
      }
    );

    console.log(
      "📋 AUDIT RESULT:",
      res.data
    );

    setLogs(
      res.data.logs || []
    );

    setChecked(true);

  } catch (err: any) {
    console.error(
      "❌ Lỗi kiểm tra AuditLog:",
      err
    );

    if (
      err.response?.status === 401
    ) {
      setError(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
      );
    } else if (
      err.response?.status === 403
    ) {
      setError(
        "Bạn không có quyền xem lịch sử thay đổi."
      );
    } else {
      setError(
        "Không thể tải lịch sử thay đổi."
      );
    }

  } finally {
    setLoading(false);
  }
};

  // ==========================================================
  // HIỂN THỊ HÀNH ĐỘNG
  // ==========================================================

 const getActionInfo = (
  action: AuditLog["action"]
) => {
  switch (action) {
    case "CREATE":
      return {
        text: "THÊM",
        icon: <AddCircle />,
        color: "success" as const,
      };

    case "UPDATE":
      return {
        text: "SỬA",
        icon: <Edit />,
        color: "warning" as const,
      };

    case "DELETE":
      return {
        text: "XÓA",
        icon: <Delete />,
        color: "error" as const,
      };
  }
};

  // ==========================================================
  // ĐỊNH DẠNG THỜI GIAN
  // ==========================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) return "";

    return new Date(date).toLocaleString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <Box sx={{ p: 3 }}>

      {/* =====================================================
          TIÊU ĐỀ
      ====================================================== */}

      <Typography
        variant="h5"
        fontWeight="bold"
        gutterBottom
      >
        📋 Theo dõi thay đổi
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Kiểm tra những thay đổi trong danh sách
        vi phạm.
      </Typography>

      {/* =====================================================
          BUTTON KIỂM TRA
      ====================================================== */}

{/* =====================================================
    BỘ LỌC
====================================================== */}

<Box
  sx={{
    display: "flex",
    gap: 2,
    flexWrap: "wrap",
    alignItems: "center",
    mb: 3,
  }}
>

  {/* TUẦN */}

  <FormControl
    size="small"
    sx={{ minWidth: 150 }}
  >
    <InputLabel>Tuần</InputLabel>

    <Select
      value={selectedWeek}
      label="Tuần"
      onChange={(e) => {
        setSelectedWeek(
           Number(e.target.value)
        );

        setChecked(false);
        setLogs([]);
      }}
    >

      {weeks.map((week) => (
        <MenuItem
          key={week}
          value={week}
        >
          Tuần {week}
        </MenuItem>
      ))}

    </Select>
  </FormControl>


  {/* LỚP */}

  <FormControl
    size="small"
    sx={{ minWidth: 150 }}
  >
    <InputLabel>Lớp</InputLabel>

    <Select
      value={selectedClass}
      label="Lớp"
      onChange={(e) => {
        setSelectedClass(
          e.target.value
        );

        setChecked(false);
        setLogs([]);
      }}
    >

      <MenuItem value="">
        Tất cả
      </MenuItem>

      {classes.map((className) => (
        <MenuItem
          key={className}
          value={className}
        >
          {className}
        </MenuItem>
      ))}

    </Select>
  </FormControl>


  {/* KIỂM TRA */}

  <Button
    variant="contained"
    startIcon={
      loading ? (
        <CircularProgress
          size={20}
          color="inherit"
        />
      ) : (
        <Search />
      )
    }
    onClick={checkChanges}
    disabled={
      loading ||
      selectedWeek === ""
    }
  >
    {loading
      ? "Đang kiểm tra..."
      : "Kiểm tra thay đổi"}
  </Button>

</Box>

      {/* =====================================================
          LỖI
      ====================================================== */}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* =====================================================
          CHƯA KIỂM TRA
      ====================================================== */}

      {!checked && !loading && !error && (
        <Paper
          sx={{
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            Chưa kiểm tra thay đổi.
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Nhấn "Kiểm tra thay đổi" để xem
            lịch sử.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          KHÔNG CÓ THAY ĐỔI
      ====================================================== */}

      {checked &&
        !loading &&
        logs.length === 0 && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
          >
            Không có sự thay đổi nào trong danh
            sách vi phạm
          </Alert>
        )}

      {/* =====================================================
          CÓ THAY ĐỔI
      ====================================================== */}

      {checked &&
        !loading &&
        logs.length > 0 && (
          <Box>

            <Typography
              variant="h6"
              sx={{ mb: 2 }}
            >
              Có {logs.length} thay đổi
            </Typography>

            {logs.map((log) => {
              const action =
                getActionInfo(log.action);

              return (
                <Paper
                  key={log._id}
                  sx={{
                    p: 2,
                    mb: 2,
                  }}
                >

                  {/* ==============================
                      HÀNH ĐỘNG
                  =============================== */}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Chip
                      icon={action.icon}
                      label={action.text}
                      color={action.color}
                      size="small"
                    />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {formatDate(
                        log.createdAt
                      )}
                    </Typography>
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* ==============================
                      NGƯỜI THỰC HIỆN
                  =============================== */}

                  <Typography>
                    <strong>
                      Người thực hiện:
                    </strong>{" "}
                    {log.username || "Không xác định"}
                  </Typography>

                  {/* ==============================
                      HỌC SINH
                  =============================== */}

                  {log.studentName && (
                    <Typography>
                      <strong>
                        Học sinh:
                      </strong>{" "}
                      {log.studentName}
                    </Typography>
                  )}

                  {/* ==============================
                      LỚP
                  =============================== */}

                  {log.className && (
                    <Typography>
                      <strong>Lớp:</strong>{" "}
                      {log.className}
                    </Typography>
                  )}

                  {/* ==============================
                      NĂM HỌC
                  =============================== */}

                  {log.academicYear && (
                    <Typography>
                      <strong>
                        Năm học:
                      </strong>{" "}
                      {log.academicYear}
                    </Typography>
                  )}

                  {/* ==============================
                      TUẦN
                  =============================== */}

                  {log.weekNumber !== null &&
                    log.weekNumber !== undefined && (
                      <Typography>
                        <strong>Tuần:</strong>{" "}
                        {log.weekNumber}
                      </Typography>
                    )}

                </Paper>
              );
            })}
          </Box>
        )}
    </Box>
  );
}
