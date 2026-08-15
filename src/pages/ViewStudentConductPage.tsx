import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";

interface Week {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher?: string;
}

interface Student {
  _id: string;
  name: string;
  className: string;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
  groupCode?: string;
  groupName?: string;
  active?: boolean;
}

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: string | Date;
  weekNumber?: number;
  handled?: boolean;
  handledBy?: string;
  studentId?: string;
}

interface ConductRow {
  studentId: string;
  name: string;

  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;

  specialViolation: boolean;

  totalPenalty: number;
  bonusScore: number;
  conductScore: number;
  classification: string;
}

const normalizeName = (name: string | null | undefined) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

const normalizeClass = (className: string) =>
  String(className ?? "")
    .trim()
    .toLowerCase();

export default function ViewStudentConductPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [rows, setRows] = useState<ConductRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  // =========================================================
  // LOAD TUẦN
  // =========================================================

  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");

      const list: Week[] = (res.data || []).map(
        (w: any, index: number) => ({
          weekNumber: Number(w.weekNumber ?? index + 1),
          startDate: w.startDate,
          endDate: w.endDate,
        })
      );

      setWeeks(list);

      try {
        const currentRes = await api.get(
          "/api/academic-weeks/current"
        );

        const currentWeek =
          currentRes.data?.weekNumber ??
          list[0]?.weekNumber ??
          "";

        setSelectedWeek(currentWeek);
      } catch {
        setSelectedWeek(list[0]?.weekNumber ?? "");
      }
    } catch (error) {
      console.error("Lỗi tải danh sách tuần:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải danh sách tuần",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD LỚP
  // =========================================================

  const loadClasses = async () => {
    try {
      const res = await api.get("/api/classes");

      const list: ClassOption[] = (res.data || [])
        .filter((cls: any) => cls?.teacher)
        .map((cls: any) => ({
          _id: cls._id,
          className: String(cls.className ?? "").trim(),
          teacher: cls.teacher,
        }))
        .filter((cls: ClassOption) => cls.className)
        .sort((a: ClassOption, b: ClassOption) =>
          a.className.localeCompare(
            b.className,
            undefined,
            { numeric: true }
          )
        );

      setClasses(list);
    } catch (error) {
      console.error("Lỗi tải danh sách lớp:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải danh sách lớp",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD RULE
  // =========================================================

  const loadRules = async () => {
    try {
      const res = await api.get("/api/rules");

      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi tải rules:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải danh sách nội quy",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD VI PHẠM
  // =========================================================

  const loadViolations = async () => {
    try {
      const res = await api.get(
        "/api/violations/all/all-student"
      );

      const data: Violation[] = Array.isArray(res.data)
        ? res.data.map((v: any) => ({
            ...v,
            handled: v.handled ?? false,
            handledBy: v.handledBy || "",
          }))
        : [];

      setViolations(data);
    } catch (error) {
      console.error("Lỗi tải vi phạm:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải dữ liệu vi phạm",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD BAN ĐẦU
  // =========================================================

  useEffect(() => {
    loadWeeks();
    loadClasses();
    loadRules();
    loadViolations();
  }, []);

  // =========================================================
  // TUẦN HIỆN TẠI
  // =========================================================

  const currentWeekData = useMemo(() => {
    if (!selectedWeek) return undefined;

    return weeks.find(
      (w) => w.weekNumber === Number(selectedWeek)
    );
  }, [weeks, selectedWeek]);

  // =========================================================
  // LOAD TOÀN BỘ HỌC SINH CỦA LỚP
  // =========================================================

  const loadStudents = useCallback(async () => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);

    try {
      const params = new URLSearchParams();
      params.append("className", selectedClass);

      const res = await api.get(
        `/api/students/search?${params.toString()}`
      );

      const data: Student[] = (res.data || [])
        .filter((student: any) => student?.name)
        .map((student: any) => ({
          _id: String(student._id),
          name: String(student.name).trim(),
          className: String(
            student.className || selectedClass
          ).trim(),
        }));

      const unique = new Map<string, Student>();

      data.forEach((student) => {
        const key =
          student._id ||
          `${normalizeName(student.name)}-${normalizeClass(
            student.className
          )}`;

        unique.set(key, student);
      });

      setStudents(Array.from(unique.values()));
    } catch (error) {
      console.error(
        "Lỗi tải danh sách học sinh:",
        error
      );

      setStudents([]);

      setSnackbar({
        open: true,
        message: `Không thể tải danh sách học sinh lớp ${selectedClass}`,
        severity: "error",
      });
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =========================================================
  // TÌM RULE
  // =========================================================

  const findRule = useCallback(
    (description: string) => {
      const target = String(description ?? "")
        .trim()
        .toLowerCase();

      return rules.find(
        (rule) =>
          String(rule.title ?? "")
            .trim()
            .toLowerCase() === target
      );
    },
    [rules]
  );

  // =========================================================
  // VI PHẠM ĐẶC BIỆT
  // =========================================================

  const isSpecialViolation = useCallback(
    (rule?: Rule) => {
      if (!rule) return false;

      const groupCode =
        rule.groupCode?.trim().toUpperCase() || "";

      return ![
        "N1",
        "N2",
        "N3",
        "N4",
        "N5",
      ].includes(groupCode);
    },
    []
  );

  // =========================================================
  // XẾP LOẠI
  // =========================================================

  const getClassification = (score: number) => {
    if (score >= 90) return "Tốt";
    if (score >= 70) return "Khá";
    if (score >= 50) return "Đạt";

    return "Chưa đạt";
  };

  // =========================================================
  // TÍNH DỮ LIỆU
  // =========================================================

  const buildRows = useCallback(() => {
    if (!selectedClass || !selectedWeek) {
      setRows([]);
      return;
    }

    if (!students.length) {
      setRows([]);
      return;
    }

    const week = weeks.find(
      (w) => w.weekNumber === Number(selectedWeek)
    );

    if (!week?.startDate || !week?.endDate) {
      setRows([]);
      return;
    }

    const start = dayjs(week.startDate).startOf("day");
    const end = dayjs(week.endDate).endOf("day");

    // -------------------------------------------------------
    // VI PHẠM CỦA LỚP + TUẦN
    // -------------------------------------------------------

    const weekViolations = violations.filter((v) => {
      const sameClass =
        normalizeClass(v.className) ===
        normalizeClass(selectedClass);

      const date = dayjs(v.time);

      const sameWeek =
        (date.isAfter(start) || date.isSame(start)) &&
        (date.isBefore(end) || date.isSame(end));

      return sameClass && sameWeek;
    });

    // -------------------------------------------------------
    // TẠO DÒNG CHO TOÀN BỘ HỌC SINH
    // -------------------------------------------------------

    const result: ConductRow[] = students.map(
      (student) => {
        const studentViolations =
          weekViolations.filter((v) => {
            // Ưu tiên studentId
            if (
              student._id &&
              v.studentId &&
              String(student._id) ===
                String(v.studentId)
            ) {
              return true;
            }

            // Fallback tên + lớp
            return (
              normalizeName(v.name) ===
                normalizeName(student.name) &&
              normalizeClass(v.className) ===
                normalizeClass(student.className)
            );
          });

        let n1 = 0;
        let n2 = 0;
        let n3 = 0;
        let n4 = 0;
        let n5 = 0;

        let totalPenalty = 0;
        let specialViolation = false;

        studentViolations.forEach((violation) => {
          const rule = findRule(
            violation.description
          );

          const point = Number(
            rule?.point ?? 0
          );

          totalPenalty += point;

          const group =
            rule?.groupCode
              ?.trim()
              .toUpperCase() || "";

          switch (group) {
            case "N1":
              n1 += point;
              break;

            case "N2":
              n2 += point;
              break;

            case "N3":
              n3 += point;
              break;

            case "N4":
              n4 += point;
              break;

            case "N5":
              n5 += point;
              break;

            default:
              if (isSpecialViolation(rule)) {
                specialViolation = true;
              }
              break;
          }
        });

        // Giữ nguyên theo code hiện tại của bạn
        const bonusScore = 0;

        const conductScore = Math.max(
          0,
          100 - totalPenalty
        );

        return {
          studentId: student._id,
          name: student.name,

          n1,
          n2,
          n3,
          n4,
          n5,

          specialViolation,

          totalPenalty,
          bonusScore,
          conductScore,

          classification:
            getClassification(conductScore),
        };
      }
    );

    // Sắp xếp tên học sinh
    result.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "vi",
        {
          sensitivity: "base",
        }
      )
    );

    setRows(result);
  }, [
    selectedClass,
    selectedWeek,
    students,
    violations,
    rules,
    weeks,
    findRule,
    isSpecialViolation,
  ]);

  useEffect(() => {
    buildRows();
  }, [buildRows]);

  // =========================================================
  // XEM DỮ LIỆU
  // =========================================================

  const handleView = () => {
    if (!selectedClass) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn lớp",
        severity: "warning",
      });
      return;
    }

    if (!selectedWeek) {
      setSnackbar({
        open: true,
        message: "Vui lòng chọn tuần",
        severity: "warning",
      });
      return;
    }

    buildRows();
  };

  // =========================================================
  // FORMAT ĐIỂM
  // =========================================================

  const formatPoint = (value: number) => {
    if (!value) return "0";

    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(1);
  };

  // =========================================================
  // CHÚ THÍCH NHÓM LỖI
  // =========================================================



  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1600px",
        mx: "auto",
        py: 3,
        px: {
          xs: 1,
          md: 3,
        },
      }}
    >
      {/* =====================================================
          TIÊU ĐỀ
      ===================================================== */}

      <Typography
        variant="h5"
        fontWeight="bold"
        align="center"
        gutterBottom
        sx={{ mb: 3 }}
      >
        HẠNH KIỂM HỌC SINH THEO TUẦN
      </Typography>

      {/* =====================================================
          BỘ LỌC
      ===================================================== */}

      <Paper
  elevation={1}
  sx={{
    p: 2,
    mb: 3,
    borderRadius: 2,
  }}
>
  {/* =====================================================
      HÀNG 1: CHỌN TUẦN - CHỌN LỚP - NÚT XEM
  ===================================================== */}
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "1fr 1fr",
        md: "minmax(300px, 1fr) minmax(300px, 1fr) auto",
      },
      gap: 1.5,
      alignItems: "center",
    }}
  >
    {/* CHỌN TUẦN */}
    <TextField
      select
      label="Chọn tuần"
      value={selectedWeek}
      onChange={(e) =>
        setSelectedWeek(
          e.target.value ? Number(e.target.value) : ""
        )
      }
      size="small"
      fullWidth
    >
      {weeks.map((week) => (
        <MenuItem
          key={week.weekNumber}
          value={week.weekNumber}
        >
          Tuần {week.weekNumber}
          {week.startDate && week.endDate
            ? ` (${dayjs(week.startDate).format(
                "DD/MM"
              )} - ${dayjs(week.endDate).format(
                "DD/MM"
              )})`
            : ""}
        </MenuItem>
      ))}
    </TextField>

    {/* CHỌN LỚP */}
    <TextField
      select
      label="Chọn lớp"
      value={selectedClass}
      onChange={(e) =>
        setSelectedClass(e.target.value)
      }
      size="small"
      fullWidth
    >
      {classes.map((cls) => (
        <MenuItem
          key={cls._id}
          value={cls.className}
        >
          {cls.className}
        </MenuItem>
      ))}
    </TextField>

    {/* NÚT XEM */}
    <Button
      variant="contained"
      onClick={handleView}
      sx={{
        height: 40,
        minWidth: 145,
        px: 3,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      XEM DỮ LIỆU
    </Button>
  </Box>

  {/* =====================================================
      HÀNG 2: CHÚ THÍCH N1 - N5
      N1 N3 N5
      N2 N4
  ===================================================== */}
  <Box
    sx={{
      mt: 1.5,
      pt: 1,
      borderTop: "1px solid",
      borderColor: "divider",

      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "1fr 1fr",
        md: "1fr 1fr 1fr",
      },

      columnGap: {
        xs: 1,
        sm: 3,
        md: 5,
      },

      rowGap: 0.4,
    }}
  >
    {/* N1 */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          width: 34,
          minWidth: 34,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        N1
      </Typography>

      <Typography
        sx={{
          width: 14,
          minWidth: 14,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        -
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {rules.find(
          (r) =>
            r.groupCode?.trim().toUpperCase() === "N1"
        )?.groupName || "Chưa thiết lập"}
      </Typography>
    </Box>

    {/* N3 */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          width: 34,
          minWidth: 34,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        N3
      </Typography>

      <Typography
        sx={{
          width: 14,
          minWidth: 14,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        -
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {rules.find(
          (r) =>
            r.groupCode?.trim().toUpperCase() === "N3"
        )?.groupName || "Chưa thiết lập"}
      </Typography>
    </Box>

    {/* N5 */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          width: 34,
          minWidth: 34,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        N5
      </Typography>

      <Typography
        sx={{
          width: 14,
          minWidth: 14,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        -
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {rules.find(
          (r) =>
            r.groupCode?.trim().toUpperCase() === "N5"
        )?.groupName || "Chưa thiết lập"}
      </Typography>
    </Box>

    {/* N2 */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          width: 34,
          minWidth: 34,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        N2
      </Typography>

      <Typography
        sx={{
          width: 14,
          minWidth: 14,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        -
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {rules.find(
          (r) =>
            r.groupCode?.trim().toUpperCase() === "N2"
        )?.groupName || "Chưa thiết lập"}
      </Typography>
    </Box>

    {/* N4 */}
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <Typography
        sx={{
          width: 34,
          minWidth: 34,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        N4
      </Typography>

      <Typography
        sx={{
          width: 14,
          minWidth: 14,
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        -
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: "14px",
          lineHeight: 1.5,
        }}
      >
        {rules.find(
          (r) =>
            r.groupCode?.trim().toUpperCase() === "N4"
        )?.groupName || "Chưa thiết lập"}
      </Typography>
    </Box>
  </Box>
</Paper>
      {/* =====================================================
          THÔNG TIN LỚP
      ===================================================== */}

      {selectedClass && selectedWeek && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ mb: 1 }}
          >
            Lớp {selectedClass}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            Tuần {selectedWeek}
            {currentWeekData?.startDate &&
            currentWeekData?.endDate
              ? ` • ${dayjs(
                  currentWeekData.startDate
                ).format(
                  "DD/MM/YYYY"
                )} - ${dayjs(
                  currentWeekData.endDate
                ).format(
                  "DD/MM/YYYY"
                )}`
              : ""}
          </Typography>

          {/* =================================================
              THỐNG KÊ
          ================================================= */}

<Stack
  direction="row"
  spacing={{ xs: 2, sm: 3 }}
  flexWrap="wrap"
  sx={{
    mb: 2,
    rowGap: 0.8,
    alignItems: "center",
  }}
>
  <Typography>
    Sĩ số: <strong>{rows.length}</strong>
  </Typography>

  <Typography>
    Có vi phạm:{" "}
    <strong>
      {rows.filter((r) => r.totalPenalty > 0).length}
    </strong>
  </Typography>

  <Typography>
    Không vi phạm:{" "}
    <strong>
      {rows.filter((r) => r.totalPenalty === 0).length}
    </strong>
  </Typography>

  <Typography>
    Vi phạm đặc biệt:{" "}
    <strong>
      {rows.filter((r) => r.specialViolation).length}
    </strong>
  </Typography>
</Stack>
        </Box>
      )}

      {/* =====================================================
          BẢNG HỌC SINH
      ===================================================== */}

      {selectedClass && selectedWeek ? (
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: 1250,
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#87cafe",
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Họ và tên
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  N1
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  N2
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  N3
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  N4
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  N5
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Vi phạm đặc biệt
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Tổng lỗi trừ
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Điểm khen thưởng
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Điểm HK
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Xếp loại
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loadingStudents ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    align="center"
                    sx={{ py: 5 }}
                  >
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    align="center"
                    sx={{ py: 5 }}
                  >
                    Không có dữ liệu học sinh.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(
                  (row, index) => (
                    <TableRow
                      key={
                        row.studentId ||
                        index
                      }
                      hover
                      sx={{
                        backgroundColor:
                          row.specialViolation
                            ? "rgba(255, 193, 7, 0.12)"
                            : undefined,
                      }}
                    >
                      <TableCell align="center">
                        {index + 1}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight:
                            row.totalPenalty >
                            0
                              ? "bold"
                              : "normal",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {row.name}
                      </TableCell>

                      <TableCell align="center">
                        {formatPoint(
                          row.n1
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {formatPoint(
                          row.n2
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {formatPoint(
                          row.n3
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {formatPoint(
                          row.n4
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {formatPoint(
                          row.n5
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {row.specialViolation ? (
                          <Box
                            component="span"
                            sx={{
                              display:
                                "inline-block",
                              px: 1,
                              py: 0.4,
                              borderRadius: 1,
                              backgroundColor:
                                "#ffcc80",
                              color:
                                "#e65100",
                              fontWeight:
                                "bold",
                            }}
                          >
                            Có
                          </Box>
                        ) : (
                          "Không"
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            row.totalPenalty >
                            0
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {formatPoint(
                          row.totalPenalty
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            row.bonusScore >
                            0
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {formatPoint(
                          row.bonusScore
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        {formatPoint(
                          row.conductScore
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          row.classification
                        }
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper
          sx={{
            p: 5,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            Vui lòng chọn tuần và lớp để
            xem danh sách học sinh.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          TỔNG KẾT CUỐI BẢNG
          GIỮ LẠI ĐỂ GV KÉO XUỐNG VẪN THẤY
      ===================================================== */}

      {rows.length > 0 && (
        <Paper
          sx={{
            mt: 2,
            p: 2,
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={3}
          >
            <Typography>
              Sĩ số:{" "}
              <strong>
                {rows.length}
              </strong>
            </Typography>

            <Typography>
              Có vi phạm:{" "}
              <strong>
                {
                  rows.filter(
                    (r) =>
                      r.totalPenalty > 0
                  ).length
                }
              </strong>
            </Typography>

            <Typography>
              Không vi phạm:{" "}
              <strong>
                {
                  rows.filter(
                    (r) =>
                      r.totalPenalty === 0
                  ).length
                }
              </strong>
            </Typography>

            <Typography>
              Vi phạm đặc biệt:{" "}
              <strong>
                {
                  rows.filter(
                    (r) =>
                      r.specialViolation
                  ).length
                }
              </strong>
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* =====================================================
          SNACKBAR
      ===================================================== */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar({
            ...snackbar,
            open: false,
          })
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar({
              ...snackbar,
              open: false,
            })
          }
          sx={{
            width: "100%",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
