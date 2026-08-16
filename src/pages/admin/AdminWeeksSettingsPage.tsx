import { useEffect, useState } from "react";
import api from "../../api/api";
import {
  Box,
  Paper,
  Typography,
  Button,
  Checkbox,
  TextField,
  Alert,
  Snackbar,
} from "@mui/material";
import dayjs from "dayjs";

type AcademicWeek = {
  _id: string;
  startDate: string;
  endDate: string;
  weekNumber: number | null;
  isStudyWeek: boolean;
};

const AdminWeeksSettingsPage = () => {
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Ngày bắt đầu năm học
  const [startSchoolYear, setStartSchoolYear] = useState("");

  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    fetchWeeks();
  }, []);

  const fetchWeeks = async () => {
    try {
      setLoading(true);

      const res = await api.get("/api/academic-weeks");

      const data: AcademicWeek[] = Array.isArray(res.data)
        ? res.data
        : [];

      setWeeks(data);

      // Nếu đã có tuần thì lấy ngày đầu tiên làm ngày bắt đầu
      if (data.length > 0) {
        const firstDate = dayjs(data[0].startDate);

        if (firstDate.isValid()) {
          setStartSchoolYear(firstDate.format("YYYY-MM-DD"));
        }
      }
    } catch (error) {
      console.error("Lỗi tải tuần học:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải danh sách tuần học",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CHECKBOX TUẦN HỌC
  // =========================================================

  const handleCheckboxChange = (id: string) => {
    if (!editMode) return;

    setWeeks((prev) =>
      prev.map((week) =>
        week._id === id
          ? {
              ...week,
              isStudyWeek: !week.isStudyWeek,
            }
          : week
      )
    );
  };

  // =========================================================
  // TẠO TUẦN MỚI
  // =========================================================

  const generateWeeks = async () => {
    if (!startSchoolYear) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn ngày bắt đầu năm học",
        severity: "warning",
      });

      return;
    }

    if (
      !window.confirm(
        "Tạo lại toàn bộ danh sách tuần học theo ngày bắt đầu đã chọn?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/api/academic-weeks/generate",
        {
          startSchoolYear,
        }
      );

      setWeeks(res.data.weeks || []);

      setSnackbar({
        open: true,
        message:
          res.data.message || "Đã tạo danh sách tuần học",
        severity: "success",
      });

      setEditMode(false);
    } catch (error: any) {
      console.error("Lỗi tạo tuần:", error);

      setSnackbar({
        open: true,
        message:
          error?.response?.data?.message ||
          "Không thể tạo danh sách tuần học",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // XÓA TOÀN BỘ
  // =========================================================

  const deleteAllWeeks = async () => {
    if (
      !window.confirm(
        "Bạn có chắc muốn xoá toàn bộ tuần học không?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await api.delete("/api/academic-weeks");

      setWeeks([]);

      setSnackbar({
        open: true,
        message: "Đã xoá toàn bộ tuần học",
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi xoá tuần:", error);

      setSnackbar({
        open: true,
        message: "Không thể xoá tuần học",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LƯU THAY ĐỔI
  // =========================================================

  const saveChanges = async () => {
    try {
      setLoading(true);

      const res = await api.put(
        "/api/academic-weeks/bulk",
        weeks
      );

      setWeeks(res.data.weeks || []);

      setSnackbar({
        open: true,
        message:
          res.data.message ||
          "Đã lưu danh sách tuần học",
        severity: "success",
      });

      setEditMode(false);
    } catch (error) {
      console.error("Lỗi lưu tuần:", error);

      setSnackbar({
        open: true,
        message: "Có lỗi khi lưu danh sách tuần",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CHỈNH SỬA
  // =========================================================

  const handleEdit = () => {
    setEditMode(true);
  };

  // =========================================================
  // XÁC ĐỊNH TUẦN HỌC ĐÃ CHỌN
  // =========================================================

  const selectedWeeks = weeks
    .filter((week) => week.isStudyWeek)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
    );

  const selectedOrderMap = new Map<string, number>();

  selectedWeeks.forEach((week, index) => {
    selectedOrderMap.set(week._id, index + 1);
  });

  // =========================================================
  // TUẦN HIỆN TẠI
  // =========================================================

  const getCurrentWeekNumber = () => {
    const today = dayjs();

    const currentIndex = selectedWeeks.findIndex(
      (week) => {
        const start = dayjs(week.startDate).startOf("day");
        const end = dayjs(week.endDate).endOf("day");

        return (
          (today.isAfter(start) ||
            today.isSame(start)) &&
          (today.isBefore(end) ||
            today.isSame(end))
        );
      }
    );

    return currentIndex >= 0
      ? currentIndex + 1
      : null;
  };

  const currentWeekNumber = getCurrentWeekNumber();

  // =========================================================
  // CHIA CỘT
  // =========================================================

  const columnSize = 10;

  const columns: AcademicWeek[][] = [];

  for (
    let i = 0;
    i < weeks.length;
    i += columnSize
  ) {
    columns.push(
      weeks.slice(i, i + columnSize)
    );
  }

  // =========================================================
  // FORMAT NGÀY
  // =========================================================

  const formatDate = (date: string) => {
    return dayjs(date).format("DD/MM/YYYY");
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box p={2}>
      <Typography
        variant="h5"
        mb={2}
        fontWeight="bold"
      >
        Quản lý tuần học
      </Typography>

      {/* =====================================================
          CẤU HÌNH NGÀY BẮT ĐẦU
      ===================================================== */}

      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
        }}
      >
        <Typography
          fontWeight="bold"
          sx={{ mb: 1 }}
        >
          Ngày bắt đầu năm học
        </Typography>

        <Box
          display="flex"
          gap={2}
          flexWrap="wrap"
          alignItems="center"
        >
          <TextField
            type="date"
            label="Ngày bắt đầu"
            value={startSchoolYear}
            onChange={(e) =>
              setStartSchoolYear(e.target.value)
            }
            InputLabelProps={{
              shrink: true,
            }}
            size="small"
            disabled={loading}
          />

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Ngày bạn chọn sẽ là ngày bắt đầu của
            Tuần 1. Tuần 1 kết thúc vào Chủ nhật.
            Từ Tuần 2 trở đi sẽ tính Thứ 2 → Chủ
            nhật.
          </Typography>
        </Box>
      </Paper>

      {/* =====================================================
          NÚT CHỨC NĂNG
      ===================================================== */}

      <Box
        mb={2}
        display="flex"
        gap={2}
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          color="secondary"
          onClick={generateWeeks}
          disabled={loading || !startSchoolYear}
        >
          Tạo tuần mới
        </Button>

        {!editMode ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleEdit}
            disabled={loading || weeks.length === 0}
          >
            Cập nhật
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={saveChanges}
            disabled={loading}
          >
            Lưu
          </Button>
        )}

        <Button
          variant="contained"
          color="error"
          onClick={deleteAllWeeks}
          disabled={loading || weeks.length === 0}
        >
          Xoá toàn bộ
        </Button>
      </Box>

      {/* =====================================================
          THÔNG BÁO
      ===================================================== */}

      {weeks.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
        >
          Đã tạo {weeks.length} khoảng tuần.{" "}
          <strong>
            {selectedWeeks.length}
          </strong>{" "}
          tuần đang được chọn là tuần học.
        </Alert>
      )}

      {/* =====================================================
          DANH SÁCH TUẦN
      ===================================================== */}

      {columns.length > 0 ? (
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
        >
          {columns.map(
            (column, colIndex) => (
              <Paper
                key={colIndex}
                elevation={3}
                sx={{
                  flex: "1 1 22%",
                  p: 2,
                  minWidth: "280px",
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  mb={1}
                >
                  Bảng {colIndex + 1}
                </Typography>

                {column.map((week) => {
                  const weekNumber =
                    selectedOrderMap.get(
                      week._id
                    );

                  const isCurrent =
                    currentWeekNumber ===
                    weekNumber;

                  return (
                    <Box
                      key={week._id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      borderBottom={1}
                      borderColor="divider"
                      py={0.7}
                      gap={1}
                    >
                      {/* NGÀY */}
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatDate(
                            week.startDate
                          )}{" "}
                          -{" "}
                          {formatDate(
                            week.endDate
                          )}
                        </Typography>
                      </Box>

                      {/* CHECKBOX */}
                      <Checkbox
                        checked={
                          week.isStudyWeek
                        }
                        disabled={!editMode}
                        onChange={() =>
                          handleCheckboxChange(
                            week._id
                          )
                        }
                      />

                      {/* TUẦN */}
                      <Typography
                        variant="body2"
                        sx={{
                          width: "80px",
                          minWidth: "80px",
                          textAlign:
                            "center",
                          color: isCurrent
                            ? "green"
                            : "inherit",
                          fontWeight:
                            isCurrent
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {week.isStudyWeek
                          ? `Tuần ${weekNumber}${
                              isCurrent
                                ? " ⭐"
                                : ""
                            }`
                          : "Nghỉ"}
                      </Typography>
                    </Box>
                  );
                })}
              </Paper>
            )
          )}
        </Box>
      ) : (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            Chưa có danh sách tuần học.
            <br />
            Hãy chọn ngày bắt đầu năm học rồi
            nhấn <strong>Tạo tuần mới</strong>.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          SNACKBAR
      ===================================================== */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar((prev) => ({
              ...prev,
              open: false,
            }))
          }
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminWeeksSettingsPage;
