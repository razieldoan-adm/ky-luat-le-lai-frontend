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

const normalizeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

const normalizeClass = (className: string) =>
  className.trim().toLowerCase();

export default function ViewStudentConductPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [rows, setRows] = useState<ConductRow[]>([]);

  const [loading, setLoading] = useState(false);
  

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

      const list = (res.data || [])
        .filter((cls: any) => cls.teacher)
        .sort((a: any, b: any) =>
          String(a.className).localeCompare(
            String(b.className),
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
      setRules(res.data || []);
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

      setViolations(
        (res.data || []).map((v: any) => ({
          ...v,
          handled: v.handled ?? false,
          handledBy: v.handledBy || "",
        }))
      );
    } catch (error) {
      console.error("Lỗi tải vi phạm:", error);

      setSnackbar({
        open: true,
        message: "Không thể tải dữ liệu vi phạm",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    loadWeeks();
    loadClasses();
    loadRules();
    loadViolations();
  }, []);

  // =========================================================
  // TÌM TUẦN
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

      const data: Student[] = (res.data || []).map(
        (student: any) => ({
          _id: student._id,
          name: student.name,
          className: student.className,
        })
      );

      // Chống trùng học sinh nếu API trả về bản ghi trùng
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
  // TÌM RULE THEO NỘI DUNG VI PHẠM
  // =========================================================

  const findRule = useCallback(
    (description: string) => {
      return rules.find(
        (rule) =>
          rule.title?.trim().toLowerCase() ===
          description?.trim().toLowerCase()
      );
    },
    [rules]
  );

  // =========================================================
  // KIỂM TRA VI PHẠM ĐẶC BIỆT
  // =========================================================

  const isSpecialViolation = useCallback(
    (rule?: Rule) => {
      if (!rule) return false;

      const groupCode =
        rule.groupCode?.trim().toUpperCase() || "";

      /*
       * Các nhóm N1-N5 là nhóm tính điểm.
       *
       * Những Rule không thuộc N1-N5 được xem là
       * vi phạm đặc biệt theo cấu trúc Rule hiện tại.
       */
      return !["N1", "N2", "N3", "N4", "N5"].includes(
        groupCode
      );
    },
    []
  );

  // =========================================================
  // XẾP LOẠI
  // =========================================================

  const getClassification = (score: number) => {
    /*
     * Giữ logic đơn giản ở frontend.
     * Nếu backend của dự án đã có quy tắc xếp loại riêng,
     * có thể thay phần này bằng giá trị backend trả về.
     */

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
    // Chỉ lấy vi phạm của lớp + tuần đang xem
    // -------------------------------------------------------

    const weekViolations = violations.filter((v) => {
      const sameClass =
        normalizeClass(v.className) ===
        normalizeClass(selectedClass);

      const date = dayjs(v.time);

      const sameWeek =
        date.isSameOrAfter(start) &&
        date.isSameOrBefore(end);

      return sameClass && sameWeek;
    });

    // -------------------------------------------------------
    // Tạo bảng theo TOÀN BỘ học sinh
    // -------------------------------------------------------

    const result: ConductRow[] = students.map(
      (student) => {
        const studentViolations =
          weekViolations.filter((v) => {
            // Ưu tiên studentId nếu dữ liệu có
            if (
              student._id &&
              v.studentId &&
              String(student._id) === String(v.studentId)
            ) {
              return true;
            }

            // Fallback theo tên + lớp
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
          const rule = findRule(violation.description);

          const point = Number(rule?.point ?? 0);

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

        /*
         * Điểm khen thưởng.
         *
         * Hiện tại dùng field bonusScore nếu dữ liệu học sinh
         * hoặc API phía backend đã cung cấp.
         *
         * Nếu hệ thống hôm qua đã có API riêng cho điểm khen
         * thưởng thì chỉ cần thay phần lấy bonusScore ở đây.
         */
        const bonusScore = 0;

        /*
         * Điểm HK:
         * 100 - tổng điểm trừ.
         *
         * Không để âm.
         */
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

    // Sắp xếp theo tên nếu danh sách backend chưa có thứ tự
    result.sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "vi",
        { sensitivity: "base" }
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
  // FORMAT
  // =========================================================

  const formatPoint = (value: number) => {
    if (!value) return "0";

    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(1);
  };

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
        px: { xs: 1, md: 3 },
      }}
    >
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
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
        }}
      >
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          alignItems={{
            xs: "stretch",
            sm: "center",
          }}
        >
          {/* TUẦN */}

          <TextField
            select
            label="Chọn tuần"
            value={selectedWeek}
            onChange={(e) =>
              setSelectedWeek(
                e.target.value
                  ? Number(e.target.value)
                  : ""
              )
            }
            size="small"
            sx={{
              minWidth: {
                xs: "100%",
                sm: 260,
              },
            }}
          >
            {weeks.map((week) => (
              <MenuItem
                key={week.weekNumber}
                value={week.weekNumber}
              >
                Tuần {week.weekNumber}
                {week.startDate && week.endDate
                  ? ` (${dayjs(
                      week.startDate
                    ).format("DD/MM")} - ${dayjs(
                      week.endDate
                    ).format("DD/MM")})`
                  : ""}
              </MenuItem>
            ))}
          </TextField>

          {/* LỚP */}

          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
            onChange={(e) =>
              setSelectedClass(e.target.value)
            }
            size="small"
            sx={{
              minWidth: {
                xs: "100%",
                sm: 180,
              },
            }}
          >
            <MenuItem value="">
              -- Chọn lớp --
            </MenuItem>

            {classes.map((cls) => (
              <MenuItem
                key={cls._id}
                value={cls.className}
              >
                {cls.className}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            onClick={handleView}
            disabled={
              !selectedClass ||
              !selectedWeek ||
              loadingStudents
            }
            sx={{
              minWidth: 130,
              height: 40,
            }}
          >
            {loadingStudents ? (
              <CircularProgress
                size={22}
                color="inherit"
              />
            ) : (
              "Xem dữ liệu"
            )}
          </Button>
        </Stack>
      </Paper>

      {/* =====================================================
          THÔNG TIN LỚP
      ===================================================== */}

      {selectedClass && selectedWeek && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Lớp {selectedClass}
          </Typography>

          <Typography color="text.secondary">
            Tuần {selectedWeek}
            {currentWeekData?.startDate &&
              currentWeekData?.endDate &&
              ` • ${dayjs(
                currentWeekData.startDate
              ).format("DD/MM/YYYY")} - ${dayjs(
                currentWeekData.endDate
              ).format("DD/MM/YYYY")}`}
            {" • "}
            Sĩ số: <strong>{students.length}</strong>
          </Typography>
        </Box>
      )}

      {/* =====================================================
          BẢNG
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
                    whiteSpace: "nowrap",
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Họ và tên
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  N1
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  N2
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  N3
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  N4
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  N5
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Vi phạm đặc biệt
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Tổng lỗi trừ
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Điểm khen thưởng
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  Điểm HK
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
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
                rows.map((row, index) => (
                  <TableRow
                    key={row.studentId || index}
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
                          row.totalPenalty > 0
                            ? "bold"
                            : "normal",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </TableCell>

                    <TableCell align="center">
                      {formatPoint(row.n1)}
                    </TableCell>

                    <TableCell align="center">
                      {formatPoint(row.n2)}
                    </TableCell>

                    <TableCell align="center">
                      {formatPoint(row.n3)}
                    </TableCell>

                    <TableCell align="center">
                      {formatPoint(row.n4)}
                    </TableCell>

                    <TableCell align="center">
                      {formatPoint(row.n5)}
                    </TableCell>

                    <TableCell align="center">
                      {row.specialViolation ? (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.4,
                            borderRadius: 1,
                            backgroundColor:
                              "#ffcc80",
                            color: "#e65100",
                            fontWeight: "bold",
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
                          row.totalPenalty > 0
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
                          row.bonusScore > 0
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
                        fontWeight: "bold",
                      }}
                    >
                      {formatPoint(
                        row.conductScore
                      )}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.classification}
                    </TableCell>
                  </TableRow>
                ))
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
            Vui lòng chọn tuần và lớp để xem danh sách
            học sinh.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          TỔNG KẾT
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
              Sĩ số: <strong>{rows.length}</strong>
            </Typography>

            <Typography>
              Có vi phạm:{" "}
              <strong>
                {
                  rows.filter(
                    (r) => r.totalPenalty > 0
                  ).length
                }
              </strong>
            </Typography>

            <Typography>
              Không vi phạm:{" "}
              <strong>
                {
                  rows.filter(
                    (r) => r.totalPenalty === 0
                  ).length
                }
              </strong>
            </Typography>

            <Typography>
              Vi phạm đặc biệt:{" "}
              <strong>
                {
                  rows.filter(
                    (r) => r.specialViolation
                  ).length
                }
              </strong>
            </Typography>
          </Stack>
        </Paper>
      )}

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
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
