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

// =========================================================
// TYPES
// =========================================================

type ViewMode = "week" | "month" | "year";

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

interface WeeklyConduct {
  _id?: string;
  name: string;
  className: string;
  academicYear: string;
  weekNumber: number;

  maxScore: number;

  groupViolations?: {
    N1?: number;
    N2?: number;
    N3?: number;
    N4?: number;
    N5?: number;
    S1?: number;
  };

  totalConductViolations?: number;
  totalDeduction?: number;
  finalScore?: number;

  hasSeriousViolation?: boolean;

  status?: "DRAFT" | "FINAL";
}

interface MonthlyWeek {
  weekNumber: number;
  score?: number;
  classification?: string;
}

interface MonthlyConduct {
  _id?: string;
  name: string;
  className: string;
  academicYear: string;

  month: number;
  year: number;

  weekNumbers?: number[];

  /*
   * Backend cũ có thể đang trả classificationCounts.
   * Backend mới nếu có dữ liệu từng tuần thì dùng weeklyScores.
   */
  weeklyScores?: MonthlyWeek[];

  classificationCounts?: {
    tot?: number;
    kha?: number;
    dat?: number;
    chuaDat?: number;
  };

  classification?: string;

  status?: "DRAFT" | "FINAL";
  finalizedAt?: string | null;
}

interface AnnualConduct {
  _id?: string;
  name: string;
  className: string;
  academicYear: string;

  months?: {
    month: number;
    year: number;
    classification: string;
  }[];

  classification?: string;

  status?: "DRAFT" | "FINAL";
  finalizedAt?: string | null;
}

interface StudyWeek {
  weekNumber: number;
}

// =========================================================
// CẤU HÌNH NĂM HỌC HIỆN TẠI
// =========================================================

const CURRENT_ACADEMIC_YEAR = "2026-2027";

// Các tháng của năm học hiện tại.
// Hiển thị trong ComboBox dạng 09/26 ... 05/27.
const SCHOOL_MONTHS = [
  { month: 9, year: 2026 },
  { month: 10, year: 2026 },
  { month: 11, year: 2026 },
  { month: 12, year: 2026 },
  { month: 1, year: 2027 },
  { month: 2, year: 2027 },
  { month: 3, year: 2027 },
  { month: 4, year: 2027 },
  { month: 5, year: 2027 },
];

// =========================================================
// HELPERS
// =========================================================

const normalizeName = (
  name: string | null | undefined
) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const normalizeClass = (
  className: string | null | undefined
) =>
  String(className ?? "")
    .trim()
    .toLowerCase();

const classificationColor = (
  classification?: string
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

const renderClassification = (
  value?: string
) => {
  if (!value) {
    return (
      <Typography
        component="span"
        color="text.secondary"
      >
        -
      </Typography>
    );
  }

  return (
    <Typography
      component="span"
      fontWeight="bold"
      sx={{
        color: classificationColor(value),
      }}
    >
      {value}
    </Typography>
  );
};

const formatScore = (
  value?: number
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "-";
  }

  return Number.isInteger(value)
    ? String(value)
    : Number(value).toFixed(1);
};

// =========================================================
// COMPONENT
// =========================================================

export default function ViewStudentConductPage() {
  // -------------------------------------------------------
  // CHẾ ĐỘ XEM
  // -------------------------------------------------------

  const [viewMode, setViewMode] =
    useState<ViewMode>("week");

  // -------------------------------------------------------
  // BỘ LỌC
  // -------------------------------------------------------

  const [selectedClass, setSelectedClass] =
    useState("");

  const [selectedWeek, setSelectedWeek] =
    useState<number | "">("");

  const [selectedMonth, setSelectedMonth] =
    useState<number | "">("");

  const [selectedMonthYear, setSelectedMonthYear] =
    useState<number | "">("");

  // -------------------------------------------------------
  // DANH SÁCH TUẦN HỌC
  // -------------------------------------------------------

  const [studyWeeks, setStudyWeeks] =
    useState<number[]>([]);

  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [classes, setClasses] =
    useState<ClassOption[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [weeklyData, setWeeklyData] =
    useState<WeeklyConduct[]>([]);

  const [monthlyData, setMonthlyData] =
    useState<MonthlyConduct[]>([]);

  const [annualData, setAnnualData] =
    useState<AnnualConduct[]>([]);

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  const [loadingClasses, setLoadingClasses] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingStudyWeeks, setLoadingStudyWeeks] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(false);

  // -------------------------------------------------------
  // SNACKBAR
  // -------------------------------------------------------

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
  // LOAD DANH SÁCH TUẦN HỌC
  // =========================================================
  //
  // QUAN TRỌNG:
  // Không lấy danh sách tuần từ weeklyData.
  //
  // Tuần được lấy trực tiếp từ:
  // /api/academic-weeks/study-weeks
  //
  // Vì vậy ComboBox Tuần sẽ có sẵn ngay khi mở trang.
  // =========================================================

  const loadStudyWeeks =
    useCallback(async () => {
      setLoadingStudyWeeks(true);

      try {
        const res = await api.get(
          "/api/academic-weeks/study-weeks"
        );

        let rawData: any[] = [];

        if (Array.isArray(res.data)) {
          rawData = res.data;
        } else if (
          Array.isArray(res.data?.weeks)
        ) {
          rawData = res.data.weeks;
        } else if (
          Array.isArray(
            res.data?.studyWeeks
          )
        ) {
          rawData =
            res.data.studyWeeks;
        } else if (
          Array.isArray(
            res.data?.data
          )
        ) {
          rawData = res.data.data;
        }

        const numbers =
          rawData
            .map(
              (item: any) => {
                if (
                  typeof item ===
                  "number"
                ) {
                  return Number(item);
                }

                return Number(
                  item?.weekNumber ??
                    item?.week ??
                    item?.number
                );
              }
            )
            .filter(
              (
                value: number
              ) =>
                Number.isInteger(
                  value
                ) &&
                value >= 1
            );

        const uniqueWeeks =
          Array.from(
            new Set(numbers)
          ).sort(
            (
              a: number,
              b: number
            ) => a - b
          );

        setStudyWeeks(
          uniqueWeeks
        );
      } catch (error) {
        console.error(
          "Lỗi tải danh sách tuần học:",
          error
        );

        setStudyWeeks([]);

        setSnackbar({
          open: true,
          message:
            "Không thể tải danh sách tuần học",
          severity: "error",
        });
      } finally {
        setLoadingStudyWeeks(
          false
        );
      }
    }, []);

  // =========================================================
  // LOAD LỚP
  // =========================================================

  const loadClasses =
    useCallback(async () => {
      setLoadingClasses(true);

      try {
        const res = await api.get(
          "/api/classes"
        );

        const list: ClassOption[] =
          (res.data || [])
            .filter(
              (cls: any) =>
                cls?.className
            )
            .map(
              (cls: any) => ({
                _id: String(
                  cls._id
                ),
                className:
                  String(
                    cls.className
                  ).trim(),
                teacher:
                  cls.teacher,
              })
            )
            .sort(
              (
                a: ClassOption,
                b: ClassOption
              ) =>
                a.className.localeCompare(
                  b.className,
                  undefined,
                  {
                    numeric: true,
                  }
                )
            );

        setClasses(list);
      } catch (error) {
        console.error(
          "Lỗi tải lớp:",
          error
        );

        setSnackbar({
          open: true,
          message:
            "Không thể tải danh sách lớp",
          severity: "error",
        });
      } finally {
        setLoadingClasses(false);
      }
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
        const res = await api.get(
          "/api/students/search",
          {
            params: {
              className:
                selectedClass,
            },
          }
        );

        const list: Student[] =
          (res.data || [])
            .filter(
              (student: any) =>
                student?.name
            )
            .map(
              (student: any) => ({
                _id: String(
                  student._id
                ),
                name: String(
                  student.name
                ).trim(),
                className:
                  String(
                    student.className ||
                      selectedClass
                  ).trim(),
              })
            );

        const map =
          new Map<
            string,
            Student
          >();

        list.forEach(
          (student) => {
            const key =
              student._id ||
              `${normalizeName(
                student.name
              )}-${normalizeClass(
                student.className
              )}`;

            map.set(
              key,
              student
            );
          }
        );

        const uniqueStudents =
          Array.from(
            map.values()
          ).sort(
            (
              a: Student,
              b: Student
            ) =>
              a.name.localeCompare(
                b.name,
                "vi",
                {
                  sensitivity:
                    "base",
                }
              )
          );

        setStudents(
          uniqueStudents
        );
      } catch (error) {
        console.error(
          "Lỗi tải học sinh:",
          error
        );

        setStudents([]);

        setSnackbar({
          open: true,
          message:
            `Không thể tải học sinh lớp ${selectedClass}`,
          severity: "error",
        });
      } finally {
        setLoadingStudents(
          false
        );
      }
    }, [selectedClass]);

  // =========================================================
  // LOAD BAN ĐẦU
  // =========================================================

  useEffect(() => {
    loadClasses();
    loadStudyWeeks();
  }, [
    loadClasses,
    loadStudyWeeks,
  ]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =========================================================
  // TẢI ĐIỂM TUẦN
  // =========================================================

  const loadWeeklyData =
    useCallback(async () => {
      if (
        !selectedClass
      ) {
        return;
      }

      setLoadingData(true);

      try {
        const params: {
          className: string;
          academicYear: string;
          weekNumber?: number;
        } = {
          className:
            selectedClass,
          academicYear:
            CURRENT_ACADEMIC_YEAR,
        };

        if (
          selectedWeek !== ""
        ) {
          params.weekNumber =
            Number(
              selectedWeek
            );
        }

        const res = await api.get(
          "/api/student-conduct-scores",
          {
            params,
          }
        );

        setWeeklyData(
          Array.isArray(
            res.data
          )
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải điểm tuần:",
          error
        );

        setWeeklyData([]);

        setSnackbar({
          open: true,
          message:
            "Không thể tải dữ liệu hạnh kiểm tuần",
          severity: "error",
        });
      } finally {
        setLoadingData(false);
      }
    }, [
      selectedClass,
      selectedWeek,
    ]);

  // =========================================================
  // TẢI ĐIỂM THÁNG
  // =========================================================

  const loadMonthlyData =
    useCallback(async () => {
      if (
        !selectedClass
      ) {
        return;
      }

      if (
        selectedMonth === "" ||
        selectedMonthYear === ""
      ) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn tháng học",
          severity: "warning",
        });

        return;
      }

      setLoadingData(true);

      try {
        const res = await api.get(
          "/api/student-monthly-conduct",
          {
            params: {
              className:
                selectedClass,
              academicYear:
                CURRENT_ACADEMIC_YEAR,
              month:
                Number(
                  selectedMonth
                ),
              year:
                Number(
                  selectedMonthYear
                ),
            },
          }
        );

        setMonthlyData(
          Array.isArray(
            res.data
          )
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải điểm tháng:",
          error
        );

        setMonthlyData([]);

        setSnackbar({
          open: true,
          message:
            "Không thể tải dữ liệu hạnh kiểm tháng",
          severity: "error",
        });
      } finally {
        setLoadingData(false);
      }
    }, [
      selectedClass,
      selectedMonth,
      selectedMonthYear,
    ]);

  // =========================================================
  // TẢI ĐIỂM NĂM
  // =========================================================

  const loadAnnualData =
    useCallback(async () => {
      if (
        !selectedClass
      ) {
        return;
      }

      setLoadingData(true);

      try {
        const res = await api.get(
          "/api/student-annual-conduct",
          {
            params: {
              className:
                selectedClass,
              academicYear:
                CURRENT_ACADEMIC_YEAR,
            },
          }
        );

        setAnnualData(
          Array.isArray(
            res.data
          )
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải điểm năm:",
          error
        );

        setAnnualData([]);

        setSnackbar({
          open: true,
          message:
            "Không thể tải dữ liệu hạnh kiểm năm",
          severity: "error",
        });
      } finally {
        setLoadingData(false);
      }
    }, [selectedClass]);

  // =========================================================
  // XEM
  // =========================================================

  const handleView =
    async () => {
      if (
        !selectedClass
      ) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn lớp",
          severity: "warning",
        });

        return;
      }

      if (
        viewMode === "week"
      ) {
        if (
          selectedWeek === ""
        ) {
          setSnackbar({
            open: true,
            message:
              "Vui lòng chọn tuần",
            severity: "warning",
          });

          return;
        }

        await loadWeeklyData();
        return;
      }

      if (
        viewMode === "month"
      ) {
        await loadMonthlyData();
        return;
      }

      await loadAnnualData();
    };

  // =========================================================
  // CHUYỂN CHẾ ĐỘ
  // =========================================================

  const changeViewMode = (
    mode: ViewMode
  ) => {
    setViewMode(mode);

    setWeeklyData([]);
    setMonthlyData([]);
    setAnnualData([]);

    // Không xóa danh sách studyWeeks.
    // Danh sách tuần đã được tải độc lập.
  };

  // =========================================================
  // TỰ ĐỘNG CHỌN THÁNG ĐẦU NĂM HỌC
  // =========================================================

  useEffect(() => {
    if (
      selectedMonth === "" &&
      selectedMonthYear === ""
    ) {
      setSelectedMonth(9);
      setSelectedMonthYear(
        2026
      );
    }
  }, [
    selectedMonth,
    selectedMonthYear,
  ]);

  // =========================================================
  // TÌM ĐIỂM TUẦN CỦA HỌC SINH
  // =========================================================

  const getWeeklyScore =
    (
      student: Student
    ) => {
      return weeklyData.find(
        (
          item: WeeklyConduct
        ) =>
          normalizeName(
            item.name
          ) ===
            normalizeName(
              student.name
            ) &&
          normalizeClass(
            item.className
          ) ===
            normalizeClass(
              student.className
            ) &&
          Number(
            item.weekNumber
          ) ===
            Number(
              selectedWeek
            )
      );
    };

  // =========================================================
  // TÌM ĐIỂM THÁNG
  // =========================================================

  const getMonthlyScore =
    (
      student: Student
    ) => {
      return monthlyData.find(
        (
          item: MonthlyConduct
        ) =>
          normalizeName(
            item.name
          ) ===
            normalizeName(
              student.name
            ) &&
          normalizeClass(
            item.className
          ) ===
            normalizeClass(
              student.className
            )
      );
    };

  // =========================================================
  // TÌM ĐIỂM NĂM
  // =========================================================

  const getAnnualScore =
    (
      student: Student
    ) => {
      return annualData.find(
        (
          item: AnnualConduct
        ) =>
          normalizeName(
            item.name
          ) ===
            normalizeName(
              student.name
            ) &&
          normalizeClass(
            item.className
          ) ===
            normalizeClass(
              student.className
            )
      );
    };

  // =========================================================
  // CÁC TUẦN HIỂN THỊ TRONG THÁNG
  // =========================================================
  //
  // Nếu backend monthly đã trả weeklyScores thì dùng nó.
  // Nếu chưa trả thì lấy weekNumbers.
  //
  // Sau này backend có thể hoàn thiện dữ liệu tuần
  // mà không phải sửa lại giao diện.
  // =========================================================

  const getMonthlyWeekNumbers =
    useCallback(
      (
        record?: MonthlyConduct
      ): number[] => {
        if (!record) {
          return [];
        }

        if (
          record.weeklyScores &&
          record.weeklyScores.length >
            0
        ) {
          return record.weeklyScores
            .map(
              (
                item: MonthlyWeek
              ) =>
                Number(
                  item.weekNumber
                )
            )
            .filter(
              (
                value: number
              ) =>
                Number.isInteger(
                  value
                )
            )
            .sort(
              (
                a: number,
                b: number
              ) =>
                a - b
            );
        }

        return (
          record.weekNumbers || []
        )
          .map(
            (value: number) =>
              Number(value)
          )
          .filter(
            (
              value: number
            ) =>
              Number.isInteger(
                value
              )
          )
          .sort(
            (
              a: number,
              b: number
            ) =>
              a - b
          );
      },
      []
    );

  // =========================================================
  // LẤY DỮ LIỆU CỦA 1 TUẦN TRONG THÁNG
  // =========================================================

  const getMonthlyWeek =
    (
      record: MonthlyConduct | undefined,
      weekNumber: number
    ) => {
      if (
        !record?.weeklyScores
      ) {
        return undefined;
      }

      return record.weeklyScores.find(
        (
          item: MonthlyWeek
        ) =>
          Number(
            item.weekNumber
          ) === weekNumber
      );
    };

  // =========================================================
  // RENDER CHÚ THÍCH VI PHẠM
  // =========================================================
  //
  // LUÔN HIỂN THỊ.
  // Vị trí: dưới bộ chọn + trên thông tin lớp.
  // =========================================================

  const renderViolationLegend =
    () => (
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor:
            "#f7fbff",
          border: "1px solid #d7e8f7",
          borderRadius: 2,
        }}
      >
        <Typography
          fontWeight="bold"
          sx={{
            mb: 0.75,
          }}
        >
          Chú thích nhóm vi phạm
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            columnGap: 2,
            rowGap: 0.5,
          }}
        >
          <Typography
            variant="body2"
          >
            <strong>N1:</strong>{" "}
            Vi phạm nhóm N1
          </Typography>

          <Typography
            variant="body2"
          >
            <strong>N2:</strong>{" "}
            Vi phạm nhóm N2
          </Typography>

          <Typography
            variant="body2"
          >
            <strong>N3:</strong>{" "}
            Vi phạm nhóm N3
          </Typography>

          <Typography
            variant="body2"
          >
            <strong>N4:</strong>{" "}
            Vi phạm nhóm N4
          </Typography>

          <Typography
            variant="body2"
          >
            <strong>N5:</strong>{" "}
            Vi phạm nhóm N5
          </Typography>

          <Typography
            variant="body2"
          >
            <strong>S1:</strong>{" "}
            Vi phạm nghiêm trọng
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.75,
          }}
        >
          Mỗi vi phạm N1–N5 bị trừ
          1 điểm. S1 không trừ điểm
          nhưng được ghi nhận là vi
          phạm nghiêm trọng.
        </Typography>
      </Paper>
    );

  // =========================================================
  // THỐNG KÊ TUẦN
  // =========================================================

  const weeklyStatistics =
    useMemo(() => {
      const total =
        students.length;

      let violationStudents = 0;
      let noViolationStudents = 0;
      let seriousStudents = 0;

      students.forEach(
        (
          student: Student
        ) => {
          const record =
            weeklyData.find(
              (
                item: WeeklyConduct
              ) =>
                normalizeName(
                  item.name
                ) ===
                  normalizeName(
                    student.name
                  ) &&
                normalizeClass(
                  item.className
                ) ===
                  normalizeClass(
                    student.className
                  ) &&
                Number(
                  item.weekNumber
                ) ===
                  Number(
                    selectedWeek
                  )
            );

          const groups =
            record?.groupViolations ||
            {};

          const totalViolation =
            Number(
              groups.N1 || 0
            ) +
            Number(
              groups.N2 || 0
            ) +
            Number(
              groups.N3 || 0
            ) +
            Number(
              groups.N4 || 0
            ) +
            Number(
              groups.N5 || 0
            );

          const hasS1 =
            Number(
              groups.S1 || 0
            ) > 0;

          if (
            totalViolation > 0
          ) {
            violationStudents++;
          } else {
            noViolationStudents++;
          }

          if (hasS1) {
            seriousStudents++;
          }
        }
      );

      return {
        total,
        violationStudents,
        noViolationStudents,
        seriousStudents,
      };
    }, [
      students,
      weeklyData,
      selectedWeek,
    ]);

  // =========================================================
  // THỐNG KÊ TUẦN
  // =========================================================

  const renderWeeklyStatistics =
    () => (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 1.25,
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Tổng bản ghi
          </Typography>

          <Typography
            fontWeight="bold"
            fontSize={20}
          >
            {weeklyData.length}
          </Typography>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            HS có vi phạm
          </Typography>

          <Typography
            fontWeight="bold"
            fontSize={20}
            sx={{
              color: "#d32f2f",
            }}
          >
            {
              weeklyStatistics.violationStudents
            }
          </Typography>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            HS không vi phạm
          </Typography>

          <Typography
            fontWeight="bold"
            fontSize={20}
            sx={{
              color: "#2e7d32",
            }}
          >
            {
              weeklyStatistics.noViolationStudents
            }
          </Typography>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            HS có S1
          </Typography>

          <Typography
            fontWeight="bold"
            fontSize={20}
            sx={{
              color: "#d32f2f",
            }}
          >
            {
              weeklyStatistics.seriousStudents
            }
          </Typography>
        </Paper>
      </Box>
    );

  // =========================================================
  // RENDER TUẦN
  // =========================================================

  const renderWeekTable =
    () => {
      if (
        loadingStudents ||
        loadingData
      ) {
        return (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <CircularProgress />
          </Paper>
        );
      }

      return (
        <>
          {renderWeeklyStatistics()}

          <TableContainer
            component={Paper}
            elevation={3}
            sx={{
              overflowX:
                "auto",
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 1000,
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor:
                      "#87cafe",
                  }}
                >
                  {[
                    "STT",
                    "Họ và tên",
                    "Tuần",
                    "N1",
                    "N2",
                    "N3",
                    "N4",
                    "N5",
                    "S1",
                    "Tổng lỗi",
                    "Điểm",
                    "Xếp loại",
                    "Trạng thái",
                  ].map(
                    (
                      title: string
                    ) => (
                      <TableCell
                        key={title}
                        align={
                          title ===
                            "Họ và tên"
                            ? "left"
                            : "center"
                        }
                        sx={{
                          fontWeight:
                            "bold",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {title}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {students.map(
                  (
                    student: Student,
                    index: number
                  ) => {
                    const record =
                      getWeeklyScore(
                        student
                      );

                    const groups =
                      record?.groupViolations ||
                      {};

                    const score =
                      record?.finalScore ??
                      100;

                    const classification =
                      score >= 90
                        ? "Tốt"
                        : score >= 70
                        ? "Khá"
                        : score >= 50
                        ? "Đạt"
                        : "Chưa đạt";

                    return (
                      <TableRow
                        key={
                          student._id ||
                          index
                        }
                        hover
                      >
                        <TableCell align="center">
                          {index + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight:
                              "bold",
                          }}
                        >
                          {student.name}
                        </TableCell>

                        <TableCell align="center">
                          {selectedWeek ||
                            "-"}
                        </TableCell>

                        <TableCell align="center">
                          {groups.N1 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {groups.N2 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {groups.N3 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {groups.N4 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {groups.N5 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {groups.S1 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {record?.totalConductViolations ??
                            0}
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{
                            fontWeight:
                              "bold",
                          }}
                        >
                          {formatScore(
                            score
                          )}
                        </TableCell>

                        <TableCell align="center">
                          {renderClassification(
                            classification
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Typography
                            component="span"
                            sx={{
                              fontSize:
                                13,
                              color:
                                record?.status ===
                                "FINAL"
                                  ? "#2e7d32"
                                  : "#ed6c02",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {record?.status ===
                            "FINAL"
                              ? "FINAL"
                              : "DRAFT"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      );
    };

  // =========================================================
  // RENDER THÁNG
  // =========================================================

  const renderMonthTable =
    () => {
      if (
        loadingStudents ||
        loadingData
      ) {
        return (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <CircularProgress />
          </Paper>
        );
      }

      return (
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            overflowX:
              "auto",
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: 900,
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor:
                    "#87cafe",
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 180,
                  }}
                >
                  Họ và tên
                </TableCell>

                {/*
                 * Nếu backend đã trả weeklyScores,
                 * tạo cột Tuần 1, Tuần 2...
                 *
                 * Trường hợp chưa có weeklyScores,
                 * lấy weekNumbers của bản ghi đầu tiên.
                 */}
                {(() => {
                  const firstRecord =
                    monthlyData[0];

                  const weeks =
                    getMonthlyWeekNumbers(
                      firstRecord
                    );

                  return weeks.flatMap(
                    (
                      week: number
                    ) => [
                      <TableCell
                        key={`week-${week}-score`}
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                          minWidth: 80,
                        }}
                      >
                        Tuần{" "}
                        {week}
                        <br />
                        <Typography
                          component="span"
                          variant="caption"
                        >
                          Điểm
                        </Typography>
                      </TableCell>,

                      <TableCell
                        key={`week-${week}-classification`}
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                          minWidth: 90,
                        }}
                      >
                        Tuần{" "}
                        {week}
                        <br />
                        <Typography
                          component="span"
                          variant="caption"
                        >
                          Xếp loại
                        </Typography>
                      </TableCell>,
                    ]
                  );
                })()}

                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 120,
                  }}
                >
                  Xếp loại tổng
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 90,
                  }}
                >
                  Trạng thái
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map(
                (
                  student: Student,
                  index: number
                ) => {
                  const record =
                    getMonthlyScore(
                      student
                    );

                  const weeks =
                    getMonthlyWeekNumbers(
                      record
                    );

                  return (
                    <TableRow
                      key={
                        student._id ||
                        index
                      }
                      hover
                    >
                      <TableCell align="center">
                        {index + 1}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        {student.name}
                      </TableCell>

                      {weeks.flatMap(
                        (
                          week: number
                        ) => {
                          const weekData =
                            getMonthlyWeek(
                              record,
                              week
                            );

                          return [
                            <TableCell
                              key={`${student._id}-${week}-score`}
                              align="center"
                            >
                              {formatScore(
                                weekData?.score
                              )}
                            </TableCell>,

                            <TableCell
                              key={`${student._id}-${week}-classification`}
                              align="center"
                            >
                              {renderClassification(
                                weekData?.classification
                              )}
                            </TableCell>,
                          ];
                        }
                      )}

                      <TableCell
                        align="center"
                      >
                        {renderClassification(
                          record?.classification
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize:
                              13,
                            color:
                              record?.status ===
                              "FINAL"
                                ? "#2e7d32"
                                : "#ed6c02",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {record?.status ===
                          "FINAL"
                            ? "FINAL"
                            : "DRAFT"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        </TableContainer>
      );
    };

  // =========================================================
  // RENDER NĂM
  // =========================================================

  const renderYearTable =
    () => {
      if (
        loadingStudents ||
        loadingData
      ) {
        return (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <CircularProgress />
          </Paper>
        );
      }

      const annualMonths =
        (() => {
          const map =
            new Map<
              string,
              {
                month: number;
                year: number;
              }
            >();

          annualData.forEach(
            (
              student: AnnualConduct
            ) => {
              student.months?.forEach(
                (
                  item: {
                    month: number;
                    year: number;
                    classification: string;
                  }
                ) => {
                  const key = `${item.year}-${item.month}`;

                  if (
                    !map.has(key)
                  ) {
                    map.set(
                      key,
                      {
                        month:
                          Number(
                            item.month
                          ),
                        year:
                          Number(
                            item.year
                          ),
                      }
                    );
                  }
                }
              );
            }
          );

          return Array.from(
            map.values()
          ).sort(
            (
              a: {
                month: number;
                year: number;
              },
              b: {
                month: number;
                year: number;
              }
            ) => {
              if (
                a.year !==
                b.year
              ) {
                return (
                  a.year -
                  b.year
                );
              }

              return (
                a.month -
                b.month
              );
            }
          );
        })();

      return (
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{
            overflowX:
              "auto",
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: 1100,
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor:
                    "#87cafe",
                }}
              >
                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 180,
                  }}
                >
                  Họ và tên
                </TableCell>

                {annualMonths.map(
                  (
                    item: {
                      month: number;
                      year: number;
                    }
                  ) => (
                    <TableCell
                      key={`${item.year}-${item.month}`}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                        minWidth: 80,
                      }}
                    >
                      T{item.month}
                      <br />
                      <Typography
                        component="span"
                        variant="caption"
                      >
                        {item.year}
                      </Typography>
                    </TableCell>
                  )
                )}

                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 110,
                  }}
                >
                  Cả năm
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 90,
                  }}
                >
                  Trạng thái
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map(
                (
                  student: Student,
                  index: number
                ) => {
                  const record =
                    getAnnualScore(
                      student
                    );

                  return (
                    <TableRow
                      key={
                        student._id ||
                        index
                      }
                      hover
                    >
                      <TableCell align="center">
                        {index + 1}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        {student.name}
                      </TableCell>

                      {annualMonths.map(
                        (
                          period: {
                            month: number;
                            year: number;
                          }
                        ) => {
                          const month =
                            record?.months?.find(
                              (
                                item: {
                                  month: number;
                                  year: number;
                                  classification: string;
                                }
                              ) =>
                                Number(
                                  item.month
                                ) ===
                                  Number(
                                    period.month
                                  ) &&
                                Number(
                                  item.year
                                ) ===
                                  Number(
                                    period.year
                                  )
                            );

                          return (
                            <TableCell
                              key={`${student._id}-${period.year}-${period.month}`}
                              align="center"
                            >
                              {renderClassification(
                                month?.classification
                              )}
                            </TableCell>
                          );
                        }
                      )}

                      <TableCell
                        align="center"
                      >
                        {renderClassification(
                          record?.classification
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize:
                              13,
                            color:
                              record?.status ===
                              "FINAL"
                                ? "#2e7d32"
                                : "#ed6c02",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {record?.status ===
                          "FINAL"
                            ? "FINAL"
                            : "DRAFT"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
        sx={{
          mb: 3,
        }}
      >
        XẾP LOẠI HẠNH KIỂM HỌC SINH
      </Typography>

      {/* =====================================================
          CHỌN CHẾ ĐỘ
      ===================================================== */}

      <Paper
        elevation={1}
        sx={{
          p: 1,
          mb: 2,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Button
            variant={
              viewMode === "week"
                ? "contained"
                : "outlined"
            }
            onClick={() =>
              changeViewMode(
                "week"
              )
            }
            sx={{
              minWidth: 130,
              fontWeight:
                "bold",
            }}
          >
            XEM TUẦN
          </Button>

          <Button
            variant={
              viewMode === "month"
                ? "contained"
                : "outlined"
            }
            onClick={() =>
              changeViewMode(
                "month"
              )
            }
            sx={{
              minWidth: 130,
              fontWeight:
                "bold",
            }}
          >
            XEM THÁNG
          </Button>

          <Button
            variant={
              viewMode === "year"
                ? "contained"
                : "outlined"
            }
            onClick={() =>
              changeViewMode(
                "year"
              )
            }
            sx={{
              minWidth: 130,
              fontWeight:
                "bold",
            }}
          >
            XEM NĂM
          </Button>
        </Box>
      </Paper>

      {/* =====================================================
          BỘ LỌC
      ===================================================== */}

      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md:
                viewMode ===
                "week"
                  ? "1fr 1fr auto"
                  : "1fr 1fr auto",
            },
            gap: 1.5,
            alignItems:
              "center",
          }}
        >
          {/* LỚP */}

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
            {loadingClasses ? (
              <MenuItem disabled>
                Đang tải...
              </MenuItem>
            ) : (
              classes.map(
                (
                  cls: ClassOption
                ) => (
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
              )
            )}
          </TextField>

          {/* TUẦN */}

          {viewMode ===
            "week" && (
            <TextField
              select
              label="Tuần"
              value={
                selectedWeek
              }
              onChange={(e) =>
                setSelectedWeek(
                  e.target
                    .value ===
                    ""
                    ? ""
                    : Number(
                        e.target
                          .value
                      )
                )
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">
                Chọn tuần
              </MenuItem>

              {loadingStudyWeeks ? (
                <MenuItem disabled>
                  Đang tải tuần...
                </MenuItem>
              ) : (
                studyWeeks.map(
                  (
                    week: number
                  ) => (
                    <MenuItem
                      key={week}
                      value={week}
                    >
                      Tuần{" "}
                      {week}
                    </MenuItem>
                  )
                )
              )}
            </TextField>
          )}

          {/* THÁNG */}

          {viewMode ===
            "month" && (
            <TextField
              select
              label="Tháng học"
              value={
                selectedMonth !==
                  "" &&
                selectedMonthYear !==
                  ""
                  ? `${selectedMonth}-${selectedMonthYear}`
                  : ""
              }
              onChange={(e) => {
                if (
                  !e.target
                    .value
                ) {
                  setSelectedMonth(
                    ""
                  );
                  setSelectedMonthYear(
                    ""
                  );
                  return;
                }

                const [
                  month,
                  year,
                ] =
                  e.target.value.split(
                    "-"
                  );

                setSelectedMonth(
                  Number(
                    month
                  )
                );

                setSelectedMonthYear(
                  Number(
                    year
                  )
                );
              }}
              size="small"
              fullWidth
            >
              {SCHOOL_MONTHS.map(
                (
                  item: {
                    month: number;
                    year: number;
                  }
                ) => (
                  <MenuItem
                    key={`${item.month}-${item.year}`}
                    value={`${item.month}-${item.year}`}
                  >
                    {String(
                      item.month
                    ).padStart(
                      2,
                      "0"
                    )}
                    /
                    {String(
                      item.year
                    ).slice(
                      -2
                    )}
                  </MenuItem>
                )
              )}
            </TextField>
          )}

          {/* NĂM */}

          {viewMode ===
            "year" && (
            <TextField
              label="Năm học"
              value={
                CURRENT_ACADEMIC_YEAR
              }
              size="small"
              fullWidth
              disabled
            />
          )}

          {/* BUTTON */}

          <Button
            variant="contained"
            onClick={
              handleView
            }
            sx={{
              height: 40,
              minWidth: 145,
              fontWeight:
                "bold",
            }}
          >
            XEM DỮ LIỆU
          </Button>
        </Box>
      </Paper>

      {/* =====================================================
          CHÚ THÍCH VI PHẠM
          
          LUÔN HIỂN THỊ
          VÀ NẰM NGAY DƯỚI BỘ LỌC
      ===================================================== */}

      {renderViolationLegend()}

      {/* =====================================================
          THÔNG TIN LỚP
      ===================================================== */}

      {selectedClass && (
        <Box
          sx={{
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
          >
            Lớp{" "}
            {selectedClass}
          </Typography>

          <Typography
            color="text.secondary"
          >
            Tổng số học sinh:{" "}
            <strong>
              {
                students.length
              }
            </strong>
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Chế độ:{" "}
            <strong>
              {viewMode ===
                "week" &&
                "Theo tuần"}

              {viewMode ===
                "month" &&
                "Theo tháng"}

              {viewMode ===
                "year" &&
                "Theo năm"}
            </strong>
          </Typography>

          {viewMode ===
            "month" &&
            selectedMonth !==
              "" &&
            selectedMonthYear !==
              "" && (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.5,
                }}
              >
                Tháng học:{" "}
                <strong>
                  {String(
                    selectedMonth
                  ).padStart(
                    2,
                    "0"
                  )}
                  /
                  {String(
                    selectedMonthYear
                  ).slice(
                    -2
                  )}
                </strong>
              </Typography>
            )}
        </Box>
      )}

      {/* =====================================================
          BẢNG
      ===================================================== */}

      {selectedClass &&
        students.length > 0 &&
        viewMode ===
          "week" &&
        renderWeekTable()}

      {selectedClass &&
        students.length > 0 &&
        viewMode ===
          "month" &&
        renderMonthTable()}

      {selectedClass &&
        students.length > 0 &&
        viewMode ===
          "year" &&
        renderYearTable()}

      {selectedClass &&
        !loadingStudents &&
        students.length ===
          0 && (
          <Paper
            sx={{
              p: 5,
              textAlign:
                "center",
            }}
          >
            <Typography color="text.secondary">
              Không có học sinh
              trong lớp này.
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
          setSnackbar(
            (
              prev
            ) => ({
              ...prev,
              open: false,
            })
          )
        }
      >
        <Alert
          severity={
            snackbar.severity
          }
          onClose={() =>
            setSnackbar(
              (
                prev
              ) => ({
                ...prev,
                open: false,
              })
            )
          }
        >
          {
            snackbar.message
          }
        </Alert>
      </Snackbar>
    </Box>
  );
}
