import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
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

// =========================================================
// INTERFACE
// =========================================================

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

// Một tuần của học sinh
interface WeekResult {
  weekNumber: number;
  startDate?: string;
  endDate?: string;

  score: number;
  classification: string;

  totalPenalty: number;
  specialViolation: boolean;
}

// Một tháng
interface MonthResult {
  month: number;
  year: number;

  weeks: WeekResult[];

  classification: string;
}

// Một dòng học sinh
interface ConductRow {
  studentId: string;
  name: string;

  months: MonthResult[];

  semester1: string;
  semester2: string;
  annual: string;
}

// =========================================================
// NORMALIZE
// =========================================================

const normalizeName = (
  name: string | null | undefined
) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");

const normalizeClass = (
  className: string
) =>
  String(className ?? "")
    .trim()
    .toLowerCase();

// =========================================================
// XẾP LOẠI TUẦN
// =========================================================

const getClassification = (
  score: number
) => {
  if (score >= 90) return "Tốt";
  if (score >= 70) return "Khá";
  if (score >= 50) return "Đạt";

  return "Chưa đạt";
};

// =========================================================
// XẾP LOẠI THÁNG
//
// THEO ĐIỀU 7:
//
// Tốt:
// Ít nhất 03 tuần Tốt và không có tuần Chưa đạt.
//
// Khá:
// Không thuộc Tốt;
// không có tuần Chưa đạt;
// có ít nhất 01 tuần Tốt hoặc ít nhất 03 tuần Khá.
//
// Đạt:
// Không thuộc Tốt/Khá;
// có ít nhất 03 tuần Đạt
// hoặc có ít nhất 02 tuần Đạt và 01 tuần Chưa đạt.
//
// Chưa đạt:
// Các trường hợp còn lại.
// =========================================================

const getMonthClassification = (
  weeks: WeekResult[]
) => {
  if (!weeks.length) return "";

  const good = weeks.filter(
    (w) => w.classification === "Tốt"
  ).length;

  const fairlyGood = weeks.filter(
    (w) => w.classification === "Khá"
  ).length;

  const pass = weeks.filter(
    (w) => w.classification === "Đạt"
  ).length;

  const notPass = weeks.filter(
    (w) => w.classification === "Chưa đạt"
  ).length;

  // TỐT
  if (good >= 3 && notPass === 0) {
    return "Tốt";
  }

  // KHÁ
  if (
    notPass === 0 &&
    (good >= 1 || fairlyGood >= 3)
  ) {
    return "Khá";
  }

  // ĐẠT
  if (
    good === 0 &&
    fairlyGood === 0 &&
    (pass >= 3 ||
      (pass >= 2 && notPass >= 1))
  ) {
    return "Đạt";
  }

  // CHƯA ĐẠT
  return "Chưa đạt";
};

// =========================================================
// XẾP LOẠI NHIỀU ĐƠN VỊ
//
// Dùng chung cho:
// - Học kỳ: đơn vị = tháng
// - Cả năm: đơn vị = tháng
//
// Không tính trung bình.
// =========================================================

const getPeriodClassification = (
  classifications: string[]
) => {
  const valid = classifications.filter(Boolean);

  if (!valid.length) return "";

  const good = valid.filter(
    (x) => x === "Tốt"
  ).length;

  const fairlyGood = valid.filter(
    (x) => x === "Khá"
  ).length;

  const pass = valid.filter(
    (x) => x === "Đạt"
  ).length;

  const notPass = valid.filter(
    (x) => x === "Chưa đạt"
  ).length;

  // Tốt
  if (good >= 3 && notPass === 0) {
    return "Tốt";
  }

  // Khá
  if (
    notPass === 0 &&
    (good >= 1 || fairlyGood >= 3)
  ) {
    return "Khá";
  }

  // Đạt
  if (
    good === 0 &&
    fairlyGood === 0 &&
    (pass >= 3 ||
      (pass >= 2 && notPass >= 1))
  ) {
    return "Đạt";
  }

  // Chưa đạt
  return "Chưa đạt";
};

// =========================================================
// MÀU XẾP LOẠI
// =========================================================

const classificationColor = (
  classification: string
) => {
  switch (classification) {
    case "Tốt":
      return "#2e7d32";

    case "Khá":
      return "#1565c0";

    case "Đạt":
      return "#ed6c02";

    case "Chưa đạt":
      return "#d32f2f";

    default:
      return undefined;
  }
};

// =========================================================
// COMPONENT
// =========================================================

export default function ViewStudentConductPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);

  const [classes, setClasses] = useState<
    ClassOption[]
  >([]);

  const [selectedClass, setSelectedClass] =
    useState("");

  const [students, setStudents] = useState<
    Student[]
  >([]);

  const [violations, setViolations] =
    useState<Violation[]>([]);

  const [rules, setRules] = useState<Rule[]>(
    []
  );

  const [rows, setRows] = useState<
    ConductRow[]
  >([]);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [snackbar, setSnackbar] =
    useState({
      open: false,
      message: "",
      severity:
        "info" as
          | "info"
          | "success"
          | "warning"
          | "error",
    });

  // =========================================================
  // LOAD TUẦN
  // =========================================================

  const loadWeeks = async () => {
    try {
      const res = await api.get(
        "/api/academic-weeks/study-weeks"
      );

      const list: Week[] = (res.data || [])
        .map((w: any, index: number) => ({
          weekNumber: Number(
            w.weekNumber ?? index + 1
          ),
          startDate: w.startDate,
          endDate: w.endDate,
        }))
        .filter(
          (w: Week) =>
            w.startDate && w.endDate
        );

      setWeeks(list);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách tuần:",
        error
      );

      setSnackbar({
        open: true,
        message:
          "Không thể tải danh sách tuần",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD LỚP
  // =========================================================

  const loadClasses = async () => {
    try {
      const res = await api.get(
        "/api/classes"
      );

      const list: ClassOption[] = (
        res.data || []
      )
        .filter(
          (cls: any) => cls?.teacher
        )
        .map((cls: any) => ({
          _id: cls._id,
          className: String(
            cls.className ?? ""
          ).trim(),
          teacher: cls.teacher,
        }))
        .filter(
          (cls: ClassOption) =>
            cls.className
        )
        .sort(
          (
            a: ClassOption,
            b: ClassOption
          ) =>
            a.className.localeCompare(
              b.className,
              undefined,
              { numeric: true }
            )
        );

      setClasses(list);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách lớp:",
        error
      );

      setSnackbar({
        open: true,
        message:
          "Không thể tải danh sách lớp",
        severity: "error",
      });
    }
  };

  // =========================================================
  // LOAD RULE
  // =========================================================

  const loadRules = async () => {
    try {
      const res = await api.get(
        "/api/rules"
      );

      setRules(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error) {
      console.error(
        "Lỗi tải rules:",
        error
      );

      setSnackbar({
        open: true,
        message:
          "Không thể tải danh sách nội quy",
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

      const data: Violation[] =
        Array.isArray(res.data)
          ? res.data.map((v: any) => ({
              ...v,
              handled:
                v.handled ?? false,
              handledBy:
                v.handledBy || "",
            }))
          : [];

      setViolations(data);
    } catch (error) {
      console.error(
        "Lỗi tải vi phạm:",
        error
      );

      setSnackbar({
        open: true,
        message:
          "Không thể tải dữ liệu vi phạm",
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
  // LOAD HỌC SINH
  // =========================================================

  const loadStudents =
    useCallback(async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);

      try {
        const params =
          new URLSearchParams();

        params.append(
          "className",
          selectedClass
        );

        const res = await api.get(
          `/api/students/search?${params.toString()}`
        );

        const data: Student[] = (
          res.data || []
        )
          .filter(
            (student: any) =>
              student?.name
          )
          .map((student: any) => ({
            _id: String(
              student._id
            ),
            name: String(
              student.name
            ).trim(),
            className: String(
              student.className ||
                selectedClass
            ).trim(),
          }));

        const unique =
          new Map<
            string,
            Student
          >();

        data.forEach(
          (student) => {
            const key =
              student._id ||
              `${normalizeName(
                student.name
              )}-${normalizeClass(
                student.className
              )}`;

            unique.set(
              key,
              student
            );
          }
        );

        setStudents(
          Array.from(
            unique.values()
          )
        );
      } catch (error) {
        console.error(
          "Lỗi tải học sinh:",
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
      const target = String(
        description ?? ""
      )
        .trim()
        .toLowerCase();

      return rules.find(
        (rule) =>
          String(
            rule.title ?? ""
          )
            .trim()
            .toLowerCase() ===
          target
      );
    },
    [rules]
  );

  // =========================================================
  // VI PHẠM ĐẶC BIỆT
  // =========================================================

  const isSpecialViolation =
    useCallback(
      (rule?: Rule) => {
        if (!rule) return false;

        const groupCode =
          rule.groupCode
            ?.trim()
            .toUpperCase() || "";

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
  // TÍNH KẾT QUẢ 1 TUẦN CHO 1 HỌC SINH
  // =========================================================

  const calculateWeekResult =
    useCallback(
      (
        student: Student,
        week: Week
      ): WeekResult => {
        let totalPenalty = 0;
        let specialViolation =
          false;

        if (
          !week.startDate ||
          !week.endDate
        ) {
          return {
            weekNumber:
              week.weekNumber,
            startDate:
              week.startDate,
            endDate:
              week.endDate,
            score: 100,
            classification: "Tốt",
            totalPenalty: 0,
            specialViolation: false,
          };
        }

        const start = dayjs(
          week.startDate
        ).startOf("day");

        const end = dayjs(
          week.endDate
        ).endOf("day");

        const studentViolations =
          violations.filter(
            (v) => {
              const sameClass =
                normalizeClass(
                  v.className
                ) ===
                normalizeClass(
                  selectedClass
                );

              const date =
                dayjs(v.time);

              const sameWeek =
                (date.isAfter(
                  start
                ) ||
                  date.isSame(
                    start
                  )) &&
                (date.isBefore(
                  end
                ) ||
                  date.isSame(
                    end
                  ));

              if (
                !sameClass ||
                !sameWeek
              ) {
                return false;
              }

              // Ưu tiên studentId
              if (
                student._id &&
                v.studentId
              ) {
                return (
                  String(
                    student._id
                  ) ===
                  String(
                    v.studentId
                  )
                );
              }

              // Fallback tên + lớp
              return (
                normalizeName(
                  v.name
                ) ===
                  normalizeName(
                    student.name
                  ) &&
                normalizeClass(
                  v.className
                ) ===
                  normalizeClass(
                    student.className
                  )
              );
            }
          );

        studentViolations.forEach(
          (violation) => {
            const rule =
              findRule(
                violation.description
              );

            const point = Number(
              rule?.point ?? 0
            );

            totalPenalty +=
              point;

            if (
              isSpecialViolation(
                rule
              )
            ) {
              specialViolation =
                true;
            }
          }
        );

        const score =
          Math.max(
            0,
            100 -
              totalPenalty
          );

        return {
          weekNumber:
            week.weekNumber,

          startDate:
            week.startDate,

          endDate:
            week.endDate,

          score,

          classification:
            getClassification(
              score
            ),

          totalPenalty,

          specialViolation,
        };
      },
      [
        violations,
        selectedClass,
        findRule,
        isSpecialViolation,
      ]
    );

  // =========================================================
  // DANH SÁCH THÁNG
  //
  // Mỗi tuần được xếp vào tháng theo ngày bắt đầu tuần.
  // Chỉ lấy các tuần thực tế có học từ API study-weeks.
  // =========================================================

  const months = useMemo(() => {
    const map =
      new Map<
        string,
        MonthResult
      >();

    weeks.forEach((week) => {
      if (!week.startDate) {
        return;
      }

      const date =
        dayjs(week.startDate);

      const month =
        date.month() + 1;

      const year =
        date.year();

      const key = `${year}-${month}`;

      if (!map.has(key)) {
        map.set(key, {
          month,
          year,
          weeks: [],
          classification: "",
        });
      }

      map.get(key)!.weeks.push({
        weekNumber:
          week.weekNumber,

        startDate:
          week.startDate,

        endDate:
          week.endDate,

        score: 0,

        classification: "",

        totalPenalty: 0,

        specialViolation:
          false,
      });
    });

    return Array.from(
      map.values()
    ).sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }

      return a.month - b.month;
    });
  }, [weeks]);

  // =========================================================
  // BUILD ROWS
  // =========================================================

  const buildRows =
    useCallback(() => {
      if (
        !selectedClass ||
        !students.length ||
        !weeks.length
      ) {
        setRows([]);
        return;
      }

      const result: ConductRow[] =
        students.map(
          (student) => {
            // ---------------------------------------------
            // TÍNH TỪNG TUẦN
            // ---------------------------------------------

            const allWeekResults =
              weeks.map(
                (week) =>
                  calculateWeekResult(
                    student,
                    week
                  )
              );

            // ---------------------------------------------
            // TÍNH TỪNG THÁNG
            // ---------------------------------------------

            const studentMonths: MonthResult[] =
              months.map(
                (month) => {
                  const monthWeeks =
                    month.weeks
                      .map(
                        (monthWeek) =>
                          allWeekResults.find(
                            (w) =>
                              w.weekNumber ===
                              monthWeek.weekNumber
                          )
                      )
                      .filter(
                        Boolean
                      ) as WeekResult[];

                  return {
                    month:
                      month.month,

                    year:
                      month.year,

                    weeks:
                      monthWeeks,

                    // QUAN TRỌNG:
                    // Không tính trung bình.
                    classification:
                      getMonthClassification(
                        monthWeeks
                      ),
                  };
                }
              );

            // ---------------------------------------------
            // HỌC KỲ I
            //
            // Mặc định:
            // Tháng 8 -> tháng 12
            // ---------------------------------------------

            const semester1Months =
              studentMonths.filter(
                (m) =>
                  m.month >= 8 &&
                  m.month <= 12
              );

            const semester1 =
              getPeriodClassification(
                semester1Months.map(
                  (m) =>
                    m.classification
                )
              );

            // ---------------------------------------------
            // HỌC KỲ II
            //
            // Tháng 1 -> tháng 5
            // ---------------------------------------------

            const semester2Months =
              studentMonths.filter(
                (m) =>
                  m.month >= 1 &&
                  m.month <= 5
              );

            const semester2 =
              getPeriodClassification(
                semester2Months.map(
                  (m) =>
                    m.classification
                )
              );

            // ---------------------------------------------
            // CẢ NĂM
            //
            // KHÔNG DÙNG HỌC KỲ.
            // Tổng hợp trực tiếp từ các tháng.
            // ---------------------------------------------

            const annual =
              getPeriodClassification(
                studentMonths.map(
                  (m) =>
                    m.classification
                )
              );

            return {
              studentId:
                student._id,

              name:
                student.name,

              months:
                studentMonths,

              semester1,

              semester2,

              annual,
            };
          }
        );

      // Sắp xếp tên
      result.sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "vi",
          {
            sensitivity:
              "base",
          }
        )
      );

      setRows(result);
    }, [
      selectedClass,
      students,
      weeks,
      months,
      calculateWeekResult,
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
        message:
          "Vui lòng chọn lớp",
        severity: "warning",
      });

      return;
    }

    buildRows();
  };

  // =========================================================
  // FORMAT ĐIỂM
  // =========================================================

  const formatPoint = (
    value: number
  ) => {
    if (!value) return "0";

    return Number.isInteger(
      value
    )
      ? String(value)
      : value.toFixed(1);
  };

  // =========================================================
  // RENDER XẾP LOẠI
  // =========================================================

  const renderClassification = (
    value: string
  ) => {
    if (!value) {
      return "-";
    }

    return (
      <Typography
        component="span"
        sx={{
          fontWeight: "bold",
          color:
            classificationColor(
              value
            ),
        }}
      >
        {value}
      </Typography>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1800px",
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
        sx={{
          mb: 3,
        }}
      >
        XẾP LOẠI HẠNH KIỂM HỌC SINH
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr auto",
            },
            gap: 1.5,
            alignItems:
              "center",
          }}
        >
          <TextField
            select
            label="Chọn lớp"
            value={
              selectedClass
            }
            onChange={(e) =>
              setSelectedClass(
                e.target.value
              )
            }
            size="small"
            fullWidth
          >
            {classes.map(
              (cls) => (
                <MenuItem
                  key={
                    cls._id
                  }
                  value={
                    cls.className
                  }
                >
                  {
                    cls.className
                  }
                </MenuItem>
              )
            )}
          </TextField>

          <Button
            variant="contained"
            onClick={
              handleView
            }
            sx={{
              height: 40,
              minWidth: 145,
              px: 3,
              fontWeight: 600,
            }}
          >
            XEM DỮ LIỆU
          </Button>
        </Box>
      </Paper>

      {/* =====================================================
          THÔNG TIN LỚP
      ===================================================== */}

      {selectedClass && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ mb: 1 }}
          >
            Lớp{" "}
            {selectedClass}
          </Typography>

          <Typography
            color="text.secondary"
          >
            Tổng số học sinh:{" "}
            <strong>
              {rows.length}
            </strong>
          </Typography>
        </Box>
      )}

      {/* =====================================================
          BẢNG
      ===================================================== */}

      {selectedClass ? (
        loadingStudents ? (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <CircularProgress />
          </Paper>
        ) : rows.length ===
          0 ? (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <Typography color="text.secondary">
              Không có dữ liệu
              học sinh.
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={3}
            sx={{
              width: "100%",
              overflowX:
                "auto",
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth:
                  1500,
                borderCollapse:
                  "collapse",
              }}
            >
              {/* =================================================
                  HEADER
              ================================================= */}

              <TableHead>
                {/* -----------------------------------------------
                    HÀNG 1
                ------------------------------------------------ */}

                <TableRow
                  sx={{
                    backgroundColor:
                      "#87cafe",
                  }}
                >
                  <TableCell
                    rowSpan={3}
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                      minWidth: 55,
                      border:
                        "1px solid #999",
                    }}
                  >
                    STT
                  </TableCell>

                  <TableCell
                    rowSpan={3}
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                      minWidth: 180,
                      border:
                        "1px solid #999",
                    }}
                  >
                    Họ và tên
                  </TableCell>

                  {/* CÁC THÁNG */}

                  {months.map(
                    (month) => (
                      <TableCell
                        key={`${month.year}-${month.month}`}
                        align="center"
                        colSpan={
                          month.weeks
                            .length *
                            2 +
                          1
                        }
                        sx={{
                          fontWeight:
                            "bold",
                          border:
                            "1px solid #999",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        Tháng{" "}
                        {
                          month.month
                        }
                      </TableCell>
                    )
                  )}

                  {/* HỌC KỲ */}

                  <TableCell
                    rowSpan={3}
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                      minWidth: 100,
                      border:
                        "1px solid #999",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    Học kỳ I
                  </TableCell>

                  <TableCell
                    rowSpan={3}
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                      minWidth: 100,
                      border:
                        "1px solid #999",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    Học kỳ II
                  </TableCell>

                  {/* CẢ NĂM */}

                  <TableCell
                    rowSpan={3}
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                      minWidth: 110,
                      border:
                        "1px solid #999",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    Cả năm
                  </TableCell>
                </TableRow>

                {/* -----------------------------------------------
                    HÀNG 2: TUẦN
                ------------------------------------------------ */}

                <TableRow
                  sx={{
                    backgroundColor:
                      "#d9efff",
                  }}
                >
                  {months.map(
                    (month) => (
                      <Box
                        component={
                          "span"
                        }
                        key={`${month.year}-${month.month}-weeks`}
                        sx={{
                          display:
                            "contents",
                        }}
                      >
                        {month.weeks.map(
                          (
                            week
                          ) => (
                            <TableCell
                              key={`${month.month}-${week.weekNumber}`}
                              colSpan={
                                2
                              }
                              align="center"
                              sx={{
                                fontWeight:
                                  "bold",
                                border:
                                  "1px solid #999",
                                minWidth: 100,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              Tuần{" "}
                              {
                                week.weekNumber
                              }
                            </TableCell>
                          )
                        )}

                        {/* XẾP LOẠI THÁNG */}

                        <TableCell
                          rowSpan={
                            2
                          }
                          align="center"
                          sx={{
                            fontWeight:
                              "bold",
                            border:
                              "1px solid #999",
                            minWidth: 110,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          Xếp loại
                          tháng
                        </TableCell>
                      </Box>
                    )
                  )}
                </TableRow>

                {/* -----------------------------------------------
                    HÀNG 3: ĐIỂM / XẾP LOẠI
                ------------------------------------------------ */}

                <TableRow
                  sx={{
                    backgroundColor:
                      "#eef8ff",
                  }}
                >
                  {months.map(
                    (month) => (
                      <Box
                        component={
                          "span"
                        }
                        key={`${month.year}-${month.month}-headers`}
                        sx={{
                          display:
                            "contents",
                        }}
                      >
                        {month.weeks.map(
                          (
                            week
                          ) => (
                            <Box
                              component={
                                "span"
                              }
                              key={`${month.month}-${week.weekNumber}-sub`}
                              sx={{
                                display:
                                  "contents",
                              }}
                            >
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight:
                                    "bold",
                                  border:
                                    "1px solid #999",
                                  minWidth: 60,
                                }}
                              >
                                Điểm
                              </TableCell>

                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight:
                                    "bold",
                                  border:
                                    "1px solid #999",
                                  minWidth: 80,
                                }}
                              >
                                Xếp loại
                              </TableCell>
                            </Box>
                          )
                        )}
                      </Box>
                    )
                  )}
                </TableRow>
              </TableHead>

              {/* =================================================
                  BODY
              ================================================= */}

              <TableBody>
                {rows.map(
                  (
                    row,
                    index
                  ) => (
                    <TableRow
                      key={
                        row.studentId ||
                        index
                      }
                      hover
                    >
                      {/* STT */}

                      <TableCell
                        align="center"
                        sx={{
                          border:
                            "1px solid #ccc",
                        }}
                      >
                        {index +
                          1}
                      </TableCell>

                      {/* HỌ TÊN */}

                      <TableCell
                        sx={{
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                          border:
                            "1px solid #ccc",
                        }}
                      >
                        {row.name}
                      </TableCell>

                      {/* THÁNG */}

                      {row.months.map(
                        (
                          month
                        ) => (
                          <Box
                            component={
                              "span"
                            }
                            key={`${row.studentId}-${month.year}-${month.month}`}
                            sx={{
                              display:
                                "contents",
                            }}
                          >
                            {/* CÁC TUẦN */}

                            {month.weeks.map(
                              (
                                week
                              ) => (
                                <Box
                                  component={
                                    "span"
                                  }
                                  key={`${row.studentId}-${week.weekNumber}`}
                                  sx={{
                                    display:
                                      "contents",
                                  }}
                                >
                                  {/* ĐIỂM */}

                                  <TableCell
                                    align="center"
                                    sx={{
                                      border:
                                        "1px solid #ccc",
                                    }}
                                  >
                                    {formatPoint(
                                      week.score
                                    )}
                                  </TableCell>

                                  {/* XẾP LOẠI */}

                                  <TableCell
                                    align="center"
                                    sx={{
                                      border:
                                        "1px solid #ccc",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {renderClassification(
                                      week.classification
                                    )}
                                  </TableCell>
                                </Box>
                              )
                            )}

                            {/* XẾP LOẠI THÁNG */}

                            <TableCell
                              align="center"
                              sx={{
                                border:
                                  "1px solid #ccc",
                                fontWeight:
                                  "bold",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {renderClassification(
                                month.classification
                              )}
                            </TableCell>
                          </Box>
                        )
                      )}

                      {/* HỌC KỲ I */}

                      <TableCell
                        align="center"
                        sx={{
                          border:
                            "1px solid #ccc",
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {renderClassification(
                          row.semester1
                        )}
                      </TableCell>

                      {/* HỌC KỲ II */}

                      <TableCell
                        align="center"
                        sx={{
                          border:
                            "1px solid #ccc",
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {renderClassification(
                          row.semester2
                        )}
                      </TableCell>

                      {/* CẢ NĂM */}

                      <TableCell
                        align="center"
                        sx={{
                          border:
                            "1px solid #ccc",
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {renderClassification(
                          row.annual
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Paper
          sx={{
            p: 5,
            textAlign:
              "center",
          }}
        >
          <Typography color="text.secondary">
            Vui lòng chọn lớp
            để xem danh sách
            học sinh.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          GHI CHÚ
      ===================================================== */}

      {rows.length > 0 && (
        <Paper
          sx={{
            mt: 2,
            p: 2,
          }}
        >
          <Typography
            fontWeight="bold"
            sx={{ mb: 1 }}
          >
            Nguyên tắc xếp loại
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Xếp loại tháng, học kỳ và
            cả năm được xác định theo
            thứ tự ưu tiên Tốt → Khá →
            Đạt → Chưa đạt, không tính
            điểm trung bình.
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Xếp loại tháng dựa trên các
            tuần thực tế có học trong
            tháng. Tuần nghỉ hoàn toàn
            không được tính.
          </Typography>
        </Paper>
      )}

      {/* =====================================================
          SNACKBAR
      ===================================================== */}

      <Snackbar
        open={
          snackbar.open
        }
        autoHideDuration={
          4000
        }
        onClose={() =>
          setSnackbar({
            ...snackbar,
            open: false,
          })
        }
        anchorOrigin={{
          vertical:
            "bottom",
          horizontal:
            "center",
        }}
      >
        <Alert
          severity={
            snackbar.severity
          }
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
          {
            snackbar.message
          }
        </Alert>
      </Snackbar>
    </Box>
  );
}
