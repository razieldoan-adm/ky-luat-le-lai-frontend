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
// CONSTANTS
// =========================================================

const CURRENT_ACADEMIC_YEAR = "2026-2027";

type ViewMode = "week" | "month" | "year";

const SCHOOL_MONTHS = [
  { month: 9, year: 2026, label: "09/26" },
  { month: 10, year: 2026, label: "10/26" },
  { month: 11, year: 2026, label: "11/26" },
  { month: 12, year: 2026, label: "12/26" },
  { month: 1, year: 2027, label: "01/27" },
  { month: 2, year: 2027, label: "02/27" },
  { month: 3, year: 2027, label: "03/27" },
  { month: 4, year: 2027, label: "04/27" },
  { month: 5, year: 2027, label: "05/27" },
];

// =========================================================
// TYPES
// =========================================================

interface StudyWeek {
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

interface WeeklyGroups {
  N1?: number;
  N2?: number;
  N3?: number;
  N4?: number;
  N5?: number;
  S1?: number;
}

interface WeeklyConduct {
  _id?: string;

  name: string;
  className: string;
  academicYear: string;
  weekNumber: number;

  maxScore?: number;

  groupViolations?: WeeklyGroups;

  totalConductViolations?: number;
  totalDeduction?: number;
  finalScore?: number;

  hasSeriousViolation?: boolean;

  status?: "DRAFT" | "FINAL";
}

interface MonthlyClassificationCounts {
  tot?: number;
  kha?: number;
  dat?: number;
  chuaDat?: number;
}

interface MonthlyConduct {
  _id?: string;

  name: string;
  className: string;
  academicYear: string;

  month: number;
  year: number;

  weekNumbers?: number[];

  classificationCounts?: MonthlyClassificationCounts;

  classification?: string;

  status?: "DRAFT" | "FINAL";

  finalizedAt?: string | null;
}

interface AnnualMonth {
  month: number;
  year: number;
  classification: string;
}

interface AnnualConduct {
  _id?: string;

  name: string;
  className: string;
  academicYear: string;

  months?: AnnualMonth[];

  classification?: string;

  status?: "DRAFT" | "FINAL";

  finalizedAt?: string | null;
}

// =========================================================
// HELPERS
// =========================================================

const normalizeName = (
  name: string | null | undefined
): string =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const normalizeClass = (
  className: string | null | undefined
): string =>
  String(className ?? "")
    .trim()
    .toLowerCase();

const classificationColor = (
  classification?: string
): string | undefined => {
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

const getConductRowStyle = (
  classification: string
) => {
  const value = classification
    .trim()
    .toLowerCase();

  if (value === "khá") {
    return {
      backgroundColor: "#fff3cd",
    };
  }

  if (value === "đạt") {
    return {
      backgroundColor: "#ffe0b2",
    };
  }

  if (
    value === "chưa đạt" ||
    value === "chưa đạt"
  ) {
    return {
      backgroundColor: "#ffcdd2",
    };
  }

  // Tốt → giữ nguyên
  return {};
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
): string => {
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

const getWeeklyClassification = (
  score: number
): string => {
  if (score >= 90) {
    return "Tốt";
  }

  if (score >= 70) {
    return "Khá";
  }

  if (score >= 50) {
    return "Đạt";
  }

  return "Chưa đạt";
};

const monthStart = (
  month: number,
  year: number
): number =>
  new Date(
    year,
    month - 1,
    1,
    0,
    0,
    0,
    0
  ).getTime();

const monthEnd = (
  month: number,
  year: number
): number =>
  new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999
  ).getTime();

const isWeekInMonth = (
  week: StudyWeek,
  month: number,
  year: number
): boolean => {
  if (
    !week.startDate ||
    !week.endDate
  ) {
    return false;
  }

  const start = new Date(
    week.startDate
  ).getTime();

  const end = new Date(
    week.endDate
  ).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return false;
  }

  const startOfMonth = monthStart(
    month,
    year
  );

  const endOfMonth = monthEnd(
    month,
    year
  );

  return (
    start <= endOfMonth &&
    end >= startOfMonth
  );
};

// =========================================================
// COMPONENT
// =========================================================

export default function ViewStudentConductPage() {
  // -------------------------------------------------------
  // VIEW MODE
  // -------------------------------------------------------

  const [viewMode, setViewMode] =
    useState<ViewMode>("week");

  // -------------------------------------------------------
  // FILTER
  // -------------------------------------------------------

  const [selectedClass, setSelectedClass] =
    useState("");

  const [selectedWeek, setSelectedWeek] =
    useState<number | "">("");

  const [selectedMonthKey, setSelectedMonthKey] =
    useState("");

  const [annualAcademicYear, setAnnualAcademicYear] =
    useState(CURRENT_ACADEMIC_YEAR);

  // -------------------------------------------------------
  // STUDY WEEKS
  // -------------------------------------------------------

  const [studyWeeks, setStudyWeeks] =
    useState<StudyWeek[]>([]);

  // -------------------------------------------------------
  // CLASSES / STUDENTS
  // -------------------------------------------------------

  const [classes, setClasses] =
    useState<ClassOption[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [weeklyData, setWeeklyData] =
    useState<WeeklyConduct[]>([]);

  const [monthlyData, setMonthlyData] =
    useState<MonthlyConduct[]>([]);

  const [monthlyWeeklyData, setMonthlyWeeklyData] =
    useState<WeeklyConduct[]>([]);

  const [annualData, setAnnualData] =
    useState<AnnualConduct[]>([]);

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  const [loadingWeeks, setLoadingWeeks] =
    useState(false);

  const [loadingClasses, setLoadingClasses] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(false);

  const [hasLoadedData, setHasLoadedData] =
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
  // SELECTED MONTH
  // =========================================================

  const selectedMonthInfo =
    useMemo(() => {
      return SCHOOL_MONTHS.find(
        (item) =>
          `${item.month}-${item.year}` ===
          selectedMonthKey
      );
    }, [selectedMonthKey]);

  // =========================================================
  // LOAD STUDY WEEKS
  // =========================================================

  const loadStudyWeeks =
    useCallback(async () => {
      setLoadingWeeks(true);

      try {
        const res =
          await api.get(
            "/api/academic-weeks/study-weeks"
          );

        const list: StudyWeek[] =
          Array.isArray(res.data)
            ? res.data
                .map(
                  (
                    item: unknown,
                    index: number
                  ) => {
                    const value =
                      item as Record<
                        string,
                        unknown
                      >;

                    return {
                      weekNumber:
                        Number(
                          value.weekNumber ??
                            index + 1
                        ),
                      startDate:
                        typeof value.startDate ===
                        "string"
                          ? value.startDate
                          : undefined,
                      endDate:
                        typeof value.endDate ===
                        "string"
                          ? value.endDate
                          : undefined,
                    };
                  }
                )
                .filter(
                  (item) =>
                    Number.isInteger(
                      item.weekNumber
                    ) &&
                    item.weekNumber > 0
                )
                .sort(
                  (
                    a: StudyWeek,
                    b: StudyWeek
                  ) =>
                    a.weekNumber -
                    b.weekNumber
                )
            : [];

        setStudyWeeks(list);

        // ---------------------------------------------
        // LẤY TUẦN HIỆN TẠI
        // ---------------------------------------------

        try {
          const currentRes =
            await api.get(
              "/api/academic-weeks/current"
            );

          const currentWeek =
            Number(
              currentRes.data
                ?.weekNumber
            );

          if (
            Number.isInteger(
              currentWeek
            ) &&
            currentWeek > 0
          ) {
            setSelectedWeek(
              currentWeek
            );
          } else {
            setSelectedWeek(
              list[0]
                ?.weekNumber ?? ""
            );
          }
        } catch {
          setSelectedWeek(
            list[0]
              ?.weekNumber ?? ""
          );
        }
      } catch (error) {
        console.error(
          "Lỗi tải danh sách tuần:",
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
        setLoadingWeeks(false);
      }
    }, []);

  // =========================================================
  // LOAD CLASSES
  // =========================================================

  const loadClasses =
    useCallback(async () => {
      setLoadingClasses(true);

      try {
        const res =
          await api.get(
            "/api/classes"
          );

        const list: ClassOption[] =
          Array.isArray(res.data)
            ? res.data
                .filter(
                  (
                    item: unknown
                  ) => {
                    const value =
                      item as Record<
                        string,
                        unknown
                      >;

                    return Boolean(
                      value.className
                    );
                  }
                )
                .map(
                  (
                    item: unknown
                  ) => {
                    const value =
                      item as Record<
                        string,
                        unknown
                      >;

                    return {
                      _id: String(
                        value._id ?? ""
                      ),
                      className:
                        String(
                          value.className
                        ).trim(),
                      teacher:
                        typeof value.teacher ===
                        "string"
                          ? value.teacher
                          : undefined,
                    };
                  }
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
                )
            : [];

        setClasses(list);
      } catch (error) {
        console.error(
          "Lỗi tải danh sách lớp:",
          error
        );

        setClasses([]);

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
  // LOAD STUDENTS
  // =========================================================

  const loadStudents =
    useCallback(async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);

      try {
        const res =
          await api.get(
            "/api/students/search",
            {
              params: {
                className:
                  selectedClass,
              },
            }
          );

        const list: Student[] =
          Array.isArray(res.data)
            ? res.data
                .filter(
                  (
                    item: unknown
                  ) => {
                    const value =
                      item as Record<
                        string,
                        unknown
                      >;

                    return Boolean(
                      value.name
                    );
                  }
                )
                .map(
                  (
                    item: unknown
                  ) => {
                    const value =
                      item as Record<
                        string,
                        unknown
                      >;

                    return {
                      _id: String(
                        value._id ?? ""
                      ),
                      name: String(
                        value.name
                      ).trim(),
                      className:
                        String(
                          value.className ??
                            selectedClass
                        ).trim(),
                    };
                  }
                )
            : [];

        const unique =
          new Map<
            string,
            Student
          >();

        list.forEach(
          (student: Student) => {
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

        const result =
          Array.from(
            unique.values()
          ).sort((a: Student, b: Student) => {
  const getLastName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1] || "";
  };

  const nameA = getLastName(a.name);
  const nameB = getLastName(b.name);

  const compareName = nameA.localeCompare(
    nameB,
    "vi",
    {
      sensitivity: "base",
    }
  );

  // Nếu trùng tên → xét toàn bộ họ tên
  if (compareName !== 0) {
    return compareName;
  }

  return a.name.localeCompare(
    b.name,
    "vi",
    {
      sensitivity: "base",
    }
  );
})

        setStudents(result);
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
        setLoadingStudents(false);
      }
    }, [selectedClass]);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    setHasLoadedData(false);
    loadStudyWeeks();
    loadClasses();
  }, [
    loadStudyWeeks,
    loadClasses,
  ]);



  // =========================================================
  // LOAD WEEK DATA
  // =========================================================

  const loadWeeklyData =
    useCallback(async () => {
      if (
        !selectedClass ||
        selectedWeek === ""
      ) {
        return;
      }

      setLoadingData(true);

      try {
        const res =
          await api.get(
            "/api/student-conduct-scores",
            {
              params: {
                className:
                  selectedClass,
                academicYear:
                  CURRENT_ACADEMIC_YEAR,
                weekNumber:
                  Number(selectedWeek),
              },
            }
          );

        setWeeklyData(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải điểm hạnh kiểm tuần:",
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
// FINALIZE TOÀN TRƯỜNG THEO TUẦN
// =========================================================

const handleFinalizeWeek = async () => {
  if (selectedWeek === "") {
    setSnackbar({
      open: true,
      message: "Vui lòng chọn tuần trước khi duyệt",
      severity: "warning",
    });

    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc muốn duyệt hạnh kiểm TOÀN TRƯỜNG của tuần ${selectedWeek} không?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setLoadingData(true);

    const res = await api.post(
      "/api/student-conduct-scores/finalize-class-week",
      {
        academicYear: CURRENT_ACADEMIC_YEAR,
        weekNumber: Number(selectedWeek),
      }
    );

    console.log(
      "✅ KẾT QUẢ DUYỆT TOÀN TRƯỜNG:",
      res.data
    );

    setSnackbar({
      open: true,
      message:
        res.data?.message ||
        `Đã duyệt hạnh kiểm toàn trường tuần ${selectedWeek}`,
      severity: "success",
    });

    // Tải lại dữ liệu lớp đang xem
    await loadWeeklyData();

  } catch (error: any) {
    console.error(
      "❌ Lỗi duyệt hạnh kiểm toàn trường:",
      error
    );

    setSnackbar({
      open: true,
      message:
        error?.response?.data?.message ||
        "Không thể duyệt hạnh kiểm toàn trường",
      severity: "error",
    });
  } finally {
    setLoadingData(false);
  }
};
  // =========================================================
  // LOAD MONTH DATA
  // =========================================================

  const loadMonthlyData =
    useCallback(async () => {
      if (
        !selectedClass ||
        !selectedMonthInfo
      ) {
        return;
      }

      setLoadingData(true);

      try {
        // ---------------------------------------------
        // 1. API THÁNG
        // ---------------------------------------------

        const monthlyRes =
          await api.get(
            "/api/student-monthly-conduct",
            {
              params: {
                className:
                  selectedClass,
                academicYear:
                  CURRENT_ACADEMIC_YEAR,
                month:
                  selectedMonthInfo.month,
                year:
                  selectedMonthInfo.year,
              },
            }
          );

        const monthlyList: MonthlyConduct[] =
          Array.isArray(
            monthlyRes.data
          )
            ? monthlyRes.data
            : [];

        setMonthlyData(
          monthlyList
        );

        // ---------------------------------------------
        // 2. XÁC ĐỊNH CÁC TUẦN TRONG THÁNG
        // ---------------------------------------------

        let monthWeeks =
          studyWeeks.filter(
            (week: StudyWeek) =>
              isWeekInMonth(
                week,
                selectedMonthInfo.month,
                selectedMonthInfo.year
              )
          );

        // ---------------------------------------------
        // FALLBACK:
        // Nếu study-week không có start/end thì
        // lấy weekNumbers từ dữ liệu tháng.
        // ---------------------------------------------

        if (
          monthWeeks.length === 0
        ) {
          const numbers =
            new Set<number>();

          monthlyList.forEach(
            (
              record: MonthlyConduct
            ) => {
              record.weekNumbers?.forEach(
                (
                  number: number
                ) => {
                  if (
                    Number.isInteger(
                      Number(number)
                    )
                  ) {
                    numbers.add(
                      Number(number)
                    );
                  }
                }
              );
            }
          );

          monthWeeks =
            Array.from(numbers)
              .sort(
                (
                  a: number,
                  b: number
                ) => a - b
              )
              .map(
                (
                  weekNumber: number
                ) => ({
                  weekNumber,
                })
              );
        }

        // ---------------------------------------------
        // 3. GỌI API TUẦN CHO TỪNG TUẦN
        //
        // Mục đích:
        // Tuần 1 -> Điểm + Xếp loại
        // Tuần 2 -> Điểm + Xếp loại
        // ...
        // ---------------------------------------------

        const weeklyResponses =
          await Promise.all(
            monthWeeks.map(
              async (
                week: StudyWeek
              ) => {
                try {
                  const response =
                    await api.get(
                      "/api/student-conduct-scores",
                      {
                        params: {
                          className:
                            selectedClass,
                          academicYear:
                            CURRENT_ACADEMIC_YEAR,
                          weekNumber:
                            week.weekNumber,
                        },
                      }
                    );

                  return Array.isArray(
                    response.data
                  )
                    ? response.data
                    : [];
                } catch (error) {
                  console.error(
                    `Lỗi tải hạnh kiểm tuần ${week.weekNumber}:`,
                    error
                  );

                  return [];
                }
              }
            )
          );

        const mergedWeeklyData: WeeklyConduct[] =
          weeklyResponses.flat();

        setMonthlyWeeklyData(
          mergedWeeklyData
        );
      } catch (error) {
        console.error(
          "Lỗi tải dữ liệu hạnh kiểm tháng:",
          error
        );

        setMonthlyData([]);
        setMonthlyWeeklyData([]);

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
      selectedMonthInfo,
      studyWeeks,
    ]);

  // =========================================================
  // LOAD ANNUAL DATA
  // =========================================================

  const loadAnnualData =
    useCallback(async () => {
      if (!selectedClass) {
        return;
      }

      setLoadingData(true);

      try {
        const res =
          await api.get(
            "/api/student-annual-conduct",
            {
              params: {
                className:
                  selectedClass,
                academicYear:
                  annualAcademicYear,
              },
            }
          );

        setAnnualData(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải hạnh kiểm năm:",
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
    }, [
      selectedClass,
      annualAcademicYear,
    ]);

  // =========================================================
  // VIEW DATA
  // =========================================================

  const handleView =
    async () => {
      if (!selectedClass) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn lớp",
          severity: "warning",
        });

        return;
      }

      if (
        viewMode === "week" &&
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

      if (
        viewMode === "month" &&
        !selectedMonthInfo
      ) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn tháng học",
          severity: "warning",
        });

        return;
      }

if (viewMode === "week") {
  await loadStudents();
  await loadWeeklyData();

  setHasLoadedData(true);
  return;
}

if (viewMode === "month") {
  await loadStudents();
  await loadMonthlyData();

  setHasLoadedData(true);
  return;
}

await loadStudents();
await loadAnnualData();

setHasLoadedData(true);
    };

  // =========================================================
  // CHANGE VIEW MODE
  // =========================================================

const changeViewMode =
  (mode: ViewMode) => {
    // Đổi chế độ xem -> luôn trở về trạng thái trống
    setViewMode(mode);

    // XÓA TOÀN BỘ DỮ LIỆU ĐANG HIỂN THỊ
    setHasLoadedData(false);

    setStudents([]);

    setWeeklyData([]);
    setMonthlyData([]);
    setMonthlyWeeklyData([]);
    setAnnualData([]);

    // Không tự động tải lại dữ liệu
    // Phải bấm "XEM DỮ LIỆU"
    if (mode === "month") {
      setSelectedMonthKey(
        `${SCHOOL_MONTHS[0].month}-${SCHOOL_MONTHS[0].year}`
      );
    }
  };

  // =========================================================
  // WEEK DATA FOR MONTH
  // =========================================================

  const monthWeeks =
    useMemo(() => {
      if (!selectedMonthInfo) {
        return [];
      }

      let result =
        studyWeeks.filter(
          (week: StudyWeek) =>
            isWeekInMonth(
              week,
              selectedMonthInfo.month,
              selectedMonthInfo.year
            )
        );

      if (
        result.length === 0
      ) {
        const numbers =
          new Set<number>();

        monthlyData.forEach(
          (
            record: MonthlyConduct
          ) => {
            record.weekNumbers?.forEach(
              (
                weekNumber: number
              ) => {
                numbers.add(
                  Number(
                    weekNumber
                  )
                );
              }
            );
          }
        );

        result =
          Array.from(numbers)
            .sort(
              (
                a: number,
                b: number
              ) => a - b
            )
            .map(
              (
                weekNumber: number
              ) => ({
                weekNumber,
              })
            );
      }

      return result;
    }, [
      studyWeeks,
      selectedMonthInfo,
      monthlyData,
    ]);

  // =========================================================
  // FIND WEEKLY RECORD
  // =========================================================

  const getWeeklyRecord =
    (
      student: Student,
      weekNumber: number,
      source: WeeklyConduct[]
    ): WeeklyConduct | undefined => {
      return source.find(
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
          ) === Number(weekNumber)
      );
    };

  // =========================================================
  // FIND MONTH RECORD
  // =========================================================

  const getMonthlyRecord =
    (
      student: Student
    ): MonthlyConduct | undefined => {
      if (!selectedMonthInfo) {
        return undefined;
      }

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
            ) &&
          Number(
            item.month
          ) ===
            selectedMonthInfo.month &&
          Number(
            item.year
          ) ===
            selectedMonthInfo.year
      );
    };

  // =========================================================
  // FIND ANNUAL RECORD
  // =========================================================

  const getAnnualRecord =
    (
      student: Student
    ): AnnualConduct | undefined => {
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
  // WEEK STATISTICS
  // =========================================================

  const weeklyStatistics =
    useMemo(() => {
      const totalRecords =
        weeklyData.length;

      const studentsWithViolation =
        weeklyData.filter(
          (
            item: WeeklyConduct
          ) =>
            Number(
              item.totalConductViolations ??
                0
            ) > 0
        ).length;

      const studentsWithS1 =
        weeklyData.filter(
          (
            item: WeeklyConduct
          ) =>
            Number(
              item.groupViolations?.S1 ??
                0
            ) > 0
        ).length;

      return {
        totalRecords,
        studentsWithViolation,
        studentsWithoutViolation:
          Math.max(
            0,
            students.length -
              studentsWithViolation
          ),
        studentsWithS1,
      };
    }, [
      weeklyData,
      students.length,
    ]);

  // =========================================================
  // ANNUAL MONTHS
  // =========================================================

  const annualMonths =
    useMemo(() => {
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
          record: AnnualConduct
        ) => {
          record.months?.forEach(
            (
              item: AnnualMonth
            ) => {
              const key =
                `${item.year}-${item.month}`;

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

      if (
        map.size === 0
      ) {
        return SCHOOL_MONTHS.map(
          (
            item
          ) => ({
            month:
              item.month,
            year:
              item.year,
          })
        );
      }

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
    }, [annualData]);

  // =========================================================
  // RENDER LEGEND
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
          border:
            "1px solid #dbeaf7",
        }}
      >
        <Typography
          fontWeight="bold"
          sx={{
            mb: 0.8,
          }}
        >
          Chú thích nhóm vi phạm
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: {
              xs: 1,
              md: 2,
            },
            lineHeight: 1.6,
          }}
        >
          <Typography variant="body2">
            <strong>N1:</strong>{" "}
            Chuyên cần, đồng phục,
            tác phong
          </Typography>

          <Typography variant="body2">
            <strong>N2:</strong>{" "}
            Vệ sinh, trực nhật,
            xếp hàng, chào cờ,
            sinh hoạt tập thể
          </Typography>

          <Typography variant="body2">
            <strong>N3:</strong>{" "}
            Thiết bị, điện thoại,
            trật tự học tập
          </Typography>

          <Typography variant="body2">
            <strong>N4:</strong>{" "}
            Bảo quản cơ sở vật chất
          </Typography>

          <Typography variant="body2">
            <strong>N5:</strong>{" "}
            Các vi phạm nội quy khác
          </Typography>

          <Typography variant="body2">
            <strong>S1:</strong>{" "}
            Đặc biệt nghiêm trọng
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.7,
          }}
        >
          Mỗi vi phạm N1-N5 bị
          trừ 1 điểm. S1 không
          trừ điểm nhưng được
          ghi nhận là vi phạm
          nghiêm trọng.
        </Typography>
      </Paper>
    );

  // =========================================================
  // RENDER WEEK STATISTICS
  // =========================================================

  const renderWeeklyStatistics =
    () => (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 1,
          mb: 2,
        }}
      >
        <Paper
          sx={{
            p: 1.2,
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
            {
              weeklyStatistics.totalRecords
            }
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 1.2,
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
              color:
                "#d32f2f",
            }}
          >
            {
              weeklyStatistics.studentsWithViolation
            }
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 1.2,
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
              color:
                "#2e7d32",
            }}
          >
            {
              weeklyStatistics.studentsWithoutViolation
            }
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 1.2,
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
              color:
                "#d32f2f",
            }}
          >
            {
              weeklyStatistics.studentsWithS1
            }
          </Typography>
        </Paper>
      </Box>
    );

  // =========================================================
  // RENDER WEEK TABLE
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
              minWidth: 1200,
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
                    getWeeklyRecord(
                      student,
                      Number(
                        selectedWeek
                      ),
                      weeklyData
                    );

                  const groups =
                    record?.groupViolations ??
                    {};

                  const score =
                    record?.finalScore ??
                    100;

                  const classification =
                    getWeeklyClassification(
                      score
                    );

                  const totalViolation =
                    Number(
                      record?.totalConductViolations ??
                        0
                    );

                  return (
                    <TableRow
  key={
    student._id ||
    `${student.name}-${index}`
  }
  hover
  sx={{
    ...getConductRowStyle(
      classification
    ),
  }}
>
                      <TableCell align="center">
                        {index + 1}
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight:
                            totalViolation >
                            0
                              ? "bold"
                              : "normal",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          student.name
                        }
                      </TableCell>

                      <TableCell align="center">
                        {selectedWeek}
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

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            totalViolation >
                            0
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {
                          totalViolation
                        }
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
                            fontSize: 13,
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
  // RENDER MONTH TABLE
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

      if (
        !selectedMonthInfo
      ) {
        return null;
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
              minWidth:
                300 +
                monthWeeks.length *
                  170,
            }}
          >
            <TableHead>
              {/* ---------------------------------------
                  HEADER DÒNG 1
              --------------------------------------- */}

              <TableRow
                sx={{
                  backgroundColor:
                    "#87cafe",
                }}
              >
                <TableCell
                  rowSpan={2}
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 55,
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 200,
                  }}
                >
                  Họ và tên
                </TableCell>

                {monthWeeks.map(
                  (
                    week: StudyWeek
                  ) => (
                    <TableCell
                      key={
                        week.weekNumber
                      }
                      colSpan={2}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                        borderLeft:
                          "1px solid #fff",
                      }}
                    >
                      Tuần{" "}
                      {
                        week.weekNumber
                      }
                    </TableCell>
                  )
                )}

                <TableCell
                  rowSpan={2}
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 120,
                    backgroundColor:
                      "#74b9ed",
                  }}
                >
                  Xếp loại tổng
                </TableCell>

                <TableCell
                  rowSpan={2}
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

              {/* ---------------------------------------
                  HEADER DÒNG 2
              --------------------------------------- */}

              <TableRow
                sx={{
                  backgroundColor:
                    "#a9dafb",
                }}
              >
                {monthWeeks.map(
                  (
                    week: StudyWeek
                  ) => (
                    <span
                      key={
                        week.weekNumber
                      }
                    >
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        Điểm
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        Xếp loại
                      </TableCell>
                    </span>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {hasLoadedData && students.map(
                (
                  student: Student,
                  index: number
                ) => {
                  const monthlyRecord =
                    getMonthlyRecord(
                      student
                    );

                  return (
                    <TableRow
                      key={
                        student._id ||
                        `${student.name}-${index}`
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
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          student.name
                        }
                      </TableCell>

                      {monthWeeks.map(
                        (
                          week: StudyWeek
                        ) => {
                          const record =
                            getWeeklyRecord(
                              student,
                              week.weekNumber,
                              monthlyWeeklyData
                            );

                          const score =
                            record?.finalScore;

                          const classification =
                            score !==
                            undefined
                              ? getWeeklyClassification(
                                  score
                                )
                              : undefined;

                          return (
                            <span
                              key={`${student._id}-${week.weekNumber}`}
                            >
                              <TableCell
                                align="center"
                              >
                                {score !==
                                undefined
                                  ? formatScore(
                                      score
                                    )
                                  : "-"}
                              </TableCell>

                              <TableCell
                                align="center"
                              >
                                {renderClassification(
                                  classification
                                )}
                              </TableCell>
                            </span>
                          );
                        }
                      )}

                      <TableCell
                        align="center"
                        sx={{
                          backgroundColor:
                            "#f2f8fd",
                        }}
                      >
                        {renderClassification(
                          monthlyRecord?.classification
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 13,
                            color:
                              monthlyRecord?.status ===
                              "FINAL"
                                ? "#2e7d32"
                                : "#ed6c02",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {monthlyRecord?.status ===
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
  // RENDER YEAR TABLE
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
              minWidth:
                1100,
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
                    minWidth: 190,
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
                    minWidth: 120,
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
                    getAnnualRecord(
                      student
                    );

                  return (
                    <TableRow
                      key={
                        student._id ||
                        `${student.name}-${index}`
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
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          student.name
                        }
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
                                item: AnnualMonth
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
                        sx={{
                          backgroundColor:
                            "#f2f8fd",
                        }}
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
                            fontSize: 13,
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
        maxWidth:
          "1800px",
        mx: "auto",
        py: 3,
        px: {
          xs: 1,
          md: 3,
        },
      }}
    >
      {/* ===================================================
          TITLE
      =================================================== */}

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

      {/* ===================================================
          VIEW MODE
      =================================================== */}

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
            justifyContent:
              "center",
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

      {/* ===================================================
          FILTER
      =================================================== */}

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
              sm: "repeat(2, 1fr)",
              md:
                viewMode === "year"
                  ? "1fr 1fr 1fr auto"
                  : "1fr 1fr auto",
            },
            gap: 1.5,
            alignItems:
              "center",
          }}
        >
          {/* ---------------------------------------------
              WEEK
          --------------------------------------------- */}

          {viewMode === "week" && (
            <>
              <TextField
                select
                label="Chọn lớp"
                value={
                  selectedClass
                }
                onChange={(e) =>{
                    const newClass = e.target.value;
                  
                    setSelectedClass(newClass);
                  
                    // Reset dữ liệu đang hiển thị
                    setHasLoadedData(false);
                    setStudents([]);
                    setWeeklyData([]);
                  }
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
                {loadingWeeks ? (
                  <MenuItem disabled>
                    Đang tải...
                  </MenuItem>
                ) : studyWeeks.length ===
                  0 ? (
                  <MenuItem disabled>
                    Không có tuần học
                  </MenuItem>
                ) : (
                  studyWeeks.map(
                    (
                      week: StudyWeek
                    ) => (
                      <MenuItem
                        key={
                          week.weekNumber
                        }
                        value={
                          week.weekNumber
                        }
                      >
                        Tuần{" "}
                        {
                          week.weekNumber
                        }
                      </MenuItem>
                    )
                  )
                )}
              </TextField>

              <Button
  variant="contained"
  onClick={handleView}
  sx={{
    height: 40,
    minWidth: 145,
    fontWeight: "bold",
  }}
>
  XEM DỮ LIỆU
</Button>

<Button
  variant="contained"
  color="success"
  onClick={handleFinalizeWeek}
  disabled={selectedWeek === "" || loadingData}
  sx={{
    height: 40,
    minWidth: 145,
    fontWeight: "bold",
  }}
>
  DUYỆT TUẦN
</Button>
            </>
          )}

          {/* ---------------------------------------------
              MONTH
          --------------------------------------------- */}

          {viewMode === "month" && (
            <>
              <TextField
                select
                label="Chọn lớp"
                value={
                  selectedClass
                }
                onChange={(e) => {
  const newClass = e.target.value;

  setSelectedClass(newClass);

  // Đổi lớp -> xóa dữ liệu cũ
  setHasLoadedData(false);

  setStudents([]);

  setWeeklyData([]);
  setMonthlyData([]);
  setMonthlyWeeklyData([]);
  setAnnualData([]);
}}
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

              <TextField
                select
                label="Tháng học"
                value={
                  selectedMonthKey
                }
onChange={(e) => {
  const newMonth = e.target.value;

  setSelectedMonthKey(newMonth);

  // Đổi tháng -> xóa dữ liệu cũ
  setHasLoadedData(false);

  setStudents([]);

  setWeeklyData([]);
  setMonthlyData([]);
  setMonthlyWeeklyData([]);
  setAnnualData([]);
}}
                size="small"
                fullWidth
              >
                {SCHOOL_MONTHS.map(
                  (
                    item
                  ) => (
                    <MenuItem
                      key={`${item.month}-${item.year}`}
                      value={`${item.month}-${item.year}`}
                    >
                      {
                        item.label
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
                  fontWeight:
                    "bold",
                }}
              >
                XEM DỮ LIỆU
              </Button>
            </>
          )}

          {/* ---------------------------------------------
              YEAR
          --------------------------------------------- */}

          {viewMode === "year" && (
            <>
              <TextField
                label="Năm học"
                value={
                  annualAcademicYear
                }
                onChange={(e) =>
                  setAnnualAcademicYear(
                    e.target.value
                  )
                }
                placeholder="VD: 2026-2027"
                size="small"
                fullWidth
              />

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

              <Box />

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
            </>
          )}
        </Box>
      </Paper>

      {/* ===================================================
          WEEK LEGEND
          LUÔN HIỂN THỊ SAU CBB
      =================================================== */}

      {viewMode === "week" &&
        renderViolationLegend()}

      {/* ===================================================
          CLASS INFORMATION
      =================================================== */}

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
            "week" &&
            selectedWeek !==
              "" && (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.5,
                }}
              >
                Tuần:{" "}
                <strong>
                  {
                    selectedWeek
                  }
                </strong>
              </Typography>
            )}

          {viewMode ===
            "month" &&
            selectedMonthInfo && (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.5,
                }}
              >
                Tháng học:{" "}
                <strong>
                  {
                    selectedMonthInfo.label
                  }
                </strong>
              </Typography>
            )}

          {viewMode ===
            "year" && (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.5,
                }}
              >
                Năm học:{" "}
                <strong>
                  {
                    annualAcademicYear
                  }
                </strong>
              </Typography>
            )}
        </Box>
      )}

      {/* ===================================================
          WEEK STATISTICS
      =================================================== */}

      {viewMode === "week" &&
        selectedClass &&
        selectedWeek !== "" &&
        !loadingStudents &&
        renderWeeklyStatistics()}

      {/* ===================================================
          TABLES
      =================================================== */}

      {selectedClass &&
        hasLoadedData &&
        students.length > 0 &&
        viewMode === "week" &&
        selectedWeek !== "" &&
        renderWeekTable()}

      {selectedClass &&
        hasLoadedData &&
        students.length > 0 &&
        viewMode === "month" &&
        selectedMonthInfo &&
        renderMonthTable()}

      {selectedClass &&
        hasLoadedData &&
        students.length > 0 &&
        viewMode === "year" &&
        renderYearTable()}

{/* ===================================================
    NO STUDENTS / CHƯA XEM DỮ LIỆU
=================================================== */}

{selectedClass &&
  !loadingStudents &&
  !hasLoadedData && (
    <Paper
      sx={{
        p: 5,
        textAlign: "center",
      }}
    >
      <Typography color="text.secondary">
        Bấm vào nút "XEM DỮ LIỆU" để xem.
      </Typography>
    </Paper>
  )}

{selectedClass &&
  !loadingStudents &&
  hasLoadedData &&
  students.length === 0 && (
    <Paper
      sx={{
        p: 5,
        textAlign: "center",
      }}
    >
      <Typography color="text.secondary">
        Không có học sinh trong lớp này.
      </Typography>
    </Paper>
  )}

      {/* ===================================================
          SNACKBAR
      =================================================== */}

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
              previous
            ) => ({
              ...previous,
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
                previous
              ) => ({
                ...previous,
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
