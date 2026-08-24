import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
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

  // ==========================================================
  // KIỂM TRA THAY ĐỔI
  // ==========================================================

  const checkChanges = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const res = await api.get(
        "/api/audit-logs/violations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLogs(res.data.logs || []);
      setChecked(true);

    } catch (err: any) {
      console.error(
        "❌ Lỗi kiểm tra AuditLog:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
        );
      } else if (err.response?.status === 403) {
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
        disabled={loading}
        sx={{
          mb: 3,
          minWidth: 220,
        }}
      >
        {loading
          ? "Đang kiểm tra..."
          : "Kiểm tra thay đổi"}
      </Button>

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
