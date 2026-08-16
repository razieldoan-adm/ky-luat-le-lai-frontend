import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Alert,
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

  maxScore?: number;

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

  createdAt?: string;
  updatedAt?: string;
}

interface MonthlyConduct {
  _id?: string;
  name: string;
  className: string;
  academicYear: string;

  month: number;
  year: number;

  weekNumbers?: number[];

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
  startDate?: string;
  endDate?: string;
}

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
  value?: number | null
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "-";
  }

  return Number.isInteger(Number(value))
    ? String(value)
    : Number(value).toFixed(1);
};

// =========================================================
// XẾP LOẠI TUẦN
// =========================================================

const getWeeklyClassification = (
  score?: number
) => {
  const value = Number(score ?? 100);

  if (value >= 90) return "Tốt";
  if (value >= 70) return "Khá";
  if (value >= 50) return "Đạt";

  return "Chưa đạt";
};

// =========================================================
// XẾP LOẠI NHIỀU TUẦN
// ĐÚNG LOGIC BACKEND ĐÃ THỐNG NHẤT
// =========================================================

const getMonthClassification = (
  classifications: string[]
) => {
  const valid =
    classifications.filter(Boolean);

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

  // TỐT
  if (
    good >= 3 &&
    notPass === 0
  ) {
    return "Tốt";
  }

  // KHÁ
  if (
    notPass === 0 &&
    (
      good >= 1 ||
      fairlyGood >= 3
    )
  ) {
    return "Khá";
  }

  // ĐẠT
  if (
    good === 0 &&
    fairlyGood === 0 &&
    (
      pass >= 3 ||
      (
        pass >= 2 &&
        notPass >= 1
      )
    )
  ) {
    return "Đạt";
  }

  return "Chưa đạt";
};

// =========================================================
// XÁC ĐỊNH NĂM HỌC HIỆN TẠI
// =========================================================

const getCurrentAcademicYear = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 8) {
    return `${year}-${year + 1}`;
  }

  return `${year - 1}-${year}`;
};

// =========================================================
// XÁC ĐỊNH NĂM LỊCH TỪ THÁNG TRONG NĂM HỌC
// =========================================================

const getCalendarYearForMonth = (
  academicYear: string,
  month: number
) => {
  const match =
    academicYear.match(
      /^(\d{4})-(\d{4})$/
    );

  if (!match) {
    return new Date().getFullYear();
  }

  const firstYear =
    Number(match[1]);

  const secondYear =
    Number(match[2]);

  if (month >= 9) {
    return firstYear;
  }

  return secondYear;
};

// =========================================================
// COMPONENT
// =========================================================

export default function ViewStudentConductPage() {
  // -------------------------------------------------------
  // CHẾ ĐỘ
  // -------------------------------------------------------

  const [viewMode, setViewMode] =
    useState<ViewMode>("week");

  // -------------------------------------------------------
  // BỘ LỌC
  // -------------------------------------------------------

  const [
    selectedClass,
    setSelectedClass,
  ] = useState("");

  const [
    academicYear,
    setAcademicYear,
  ] = useState(
    getCurrentAcademicYear()
  );

  const [
    selectedWeek,
    setSelectedWeek,
  ] = useState<number | "">("");

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState<number | "">("");

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

  const [studyWeeks, setStudyWeeks] =
    useState<StudyWeek[]>([]);

  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------

  const [
    loadingClasses,
    setLoadingClasses,
  ] = useState(false);

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [
    loadingData,
    setLoadingData,
  ] = useState(false);

  const [
    loadingWeeks,
    setLoadingWeeks,
  ] = useState(false);

  // -------------------------------------------------------
  // SNACKBAR
  // -------------------------------------------------------

  const [
    snackbar,
    setSnackbar,
  ] = useState({
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
            .map((cls: any) => ({
              _id: String(
                cls._id
              ),
              className: String(
                cls.className
              ).trim(),
              teacher:
                cls.teacher,
            }))
            .sort(
              (
                a,
                b
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
  // LOAD TUẦN HỌC
  // =========================================================

  const loadStudyWeeks =
    useCallback(async () => {
      setLoadingWeeks(true);

      try {
        const res = await api.get(
          "/api/academic-weeks/study-weeks"
        );

        const raw =
          Array.isArray(res.data)
            ? res.data
            : Array.isArray(
                res.data?.data
              )
            ? res.data.data
            : [];

        const result: StudyWeek[] =
          raw
            .map((item: any) => ({
              weekNumber: Number(
                item.weekNumber ??
                  item.week ??
                  item.number
              ),
              startDate:
                item.startDate ??
                item.start ??
                item.from,
              endDate:
                item.endDate ??
                item.end ??
                item.to,
            }))
            .filter(
              (item: StudyWeek) =>
                Number.isInteger(
                  item.weekNumber
                ) &&
                item.weekNumber > 0
            )
            .sort(
              (a, b) =>
                a.weekNumber -
                b.weekNumber
            );

        setStudyWeeks(result);

        if (
          !selectedWeek &&
          result.length
        ) {
          setSelectedWeek(
            result[0].weekNumber
          );
        }
      } catch (error) {
        console.error(
          "Lỗi tải tuần học:",
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
    }, [selectedWeek]);

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

        const map =
          new Map<string, Student>();

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
            (a, b) =>
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
        setLoadingStudents(false);
      }
    }, [selectedClass]);

  // =========================================================
  // INITIAL
  // =========================================================

  useEffect(() => {
    loadClasses();
    loadStudyWeeks();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =========================================================
  // TUẦN CÓ THỂ CHỌN
  // =========================================================

  const weekNumbers = useMemo(
    () =>
      studyWeeks
        .map(
          (item) =>
            item.weekNumber
        )
        .filter(
          (
            value,
            index,
            array
          ) =>
            array.indexOf(
              value
            ) === index
        )
        .sort(
          (a, b) => a - b
        ),
    [studyWeeks]
  );

  // =========================================================
  // LOAD ĐIỂM TUẦN
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
                academicYear,
                weekNumber:
                  Number(
                    selectedWeek
                  ),
              },
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
      academicYear,
    ]);

  // =========================================================
  // LOAD THÁNG
  // =========================================================

  const loadMonthlyData =
    useCallback(async () => {
      if (
        !selectedClass ||
        selectedMonth === ""
      ) {
        return;
      }

      setLoadingData(true);

      try {
        const month =
          Number(
            selectedMonth
          );

        const year =
          getCalendarYearForMonth(
            academicYear,
            month
          );

        // -----------------------------------------------
        // 1. Lấy bản ghi tháng đã chốt
        // -----------------------------------------------

        const monthlyRes =
          await api.get(
            "/api/student-monthly-conduct",
            {
              params: {
                className:
                  selectedClass,
                academicYear,
                month,
                year,
              },
            }
          );

        setMonthlyData(
          Array.isArray(
            monthlyRes.data
          )
            ? monthlyRes.data
            : []
        );

        // -----------------------------------------------
        // 2. Lấy toàn bộ điểm tuần của lớp
        // -----------------------------------------------

        const weeklyRes =
          await api.get(
            "/api/student-conduct-scores",
            {
              params: {
                className:
                  selectedClass,
                academicYear,
              },
            }
          );

        setWeeklyData(
          Array.isArray(
            weeklyRes.data
          )
            ? weeklyRes.data
            : []
        );
      } catch (error) {
        console.error(
          "Lỗi tải dữ liệu tháng:",
          error
        );

        setMonthlyData([]);
        setWeeklyData([]);

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
      academicYear,
    ]);

  // =========================================================
  // LOAD NĂM
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
                academicYear,
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
    }, [
      selectedClass,
      academicYear,
    ]);

  // =========================================================
  // XEM
  // =========================================================

  const handleView =
    async () => {
      if (!selectedClass) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn lớp",
          severity:
            "warning",
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
          severity:
            "warning",
        });

        return;
      }

      if (
        viewMode === "month" &&
        selectedMonth === ""
      ) {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn tháng",
          severity:
            "warning",
        });

        return;
      }

      if (
        viewMode === "week"
      ) {
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

  const changeViewMode =
    (mode: ViewMode) => {
      setViewMode(mode);

      setWeeklyData([]);
      setMonthlyData([]);
      setAnnualData([]);

      if (mode === "week") {
        if (
          selectedWeek === "" &&
          weekNumbers.length
        ) {
          setSelectedWeek(
            weekNumbers[0]
          );
        }
      }

      if (mode === "month") {
        if (
          selectedMonth === ""
        ) {
          setSelectedMonth(9);
        }
      }
    };

  // =========================================================
  // TÌM ĐIỂM TUẦN
  // =========================================================

  const getWeeklyScore =
    (
      student: Student,
      weekNumber: number
    ) => {
      return weeklyData.find(
        (item) =>
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
              weekNumber
            )
      );
    };

  // =========================================================
  // CÁC TUẦN CỦA THÁNG
  // =========================================================

  const monthWeekNumbers =
    useMemo(() => {
      if (
        selectedMonth === ""
      ) {
        return [];
      }

      const month =
        Number(
          selectedMonth
        );

      const year =
        getCalendarYearForMonth(
          academicYear,
          month
        );

      // -----------------------------------------------
      // Ưu tiên weekNumbers từ bản ghi tháng
      // -----------------------------------------------

      const savedWeeks =
        new Set<number>();

      monthlyData.forEach(
        (item) => {
          item.weekNumbers?.forEach(
            (week) => {
              if (
                Number.isInteger(
                  Number(week)
                )
              ) {
                savedWeeks.add(
                  Number(week)
                );
              }
            }
          );
        }
      );

      if (
        savedWeeks.size > 0
      ) {
        return Array.from(
          savedWeeks
        ).sort(
          (a, b) =>
            a - b
        );
      }

      // -----------------------------------------------
      // Nếu chưa có bản ghi tháng:
      // xác định tuần dựa trên startDate/endDate
      // -----------------------------------------------

      const result =
        studyWeeks
          .filter((week) => {
            if (
              !week.startDate ||
              !week.endDate
            ) {
              return false;
            }

            const start =
              new Date(
                week.startDate
              );

            const end =
              new Date(
                week.endDate
              );

            const firstDay =
              new Date(
                year,
                month - 1,
                1
              );

            const lastDay =
              new Date(
                year,
                month,
                0,
                23,
                59,
                59,
                999
              );

            return (
              start <=
                lastDay &&
              end >=
                firstDay
            );
          })
          .map(
            (week) =>
              week.weekNumber
          );

      return Array.from(
        new Set(result)
      ).sort(
        (a, b) => a - b
      );
    }, [
      selectedMonth,
      academicYear,
      monthlyData,
      studyWeeks,
    ]);

  // =========================================================
  // XẾP LOẠI THÁNG CỦA HỌC SINH
  // =========================================================

  const getStudentMonthClassification =
    (
      student: Student
    ) => {
      const classifications =
        monthWeekNumbers
          .map(
            (week) => {
              const record =
                getWeeklyScore(
                  student,
                  week
                );

              if (!record) {
                return "";
              }

              return getWeeklyClassification(
                record.finalScore
              );
            }
          )
          .filter(Boolean);

      return getMonthClassification(
        classifications
      );
    };

  // =========================================================
  // CÁC THÁNG TRONG NĂM
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
        (student) => {
          student.months?.forEach(
            (item) => {
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

      // Nếu backend chưa có dữ liệu,
      // vẫn hiển thị 9 tháng học.
      if (
        map.size === 0
      ) {
        for (
          let month = 9;
          month <= 12;
          month++
        ) {
          map.set(
            `${academicYear.split("-")[0]}-${month}`,
            {
              month,
              year:
                Number(
                  academicYear.split(
                    "-"
                  )[0]
                ),
            }
          );
        }

        for (
          let month = 1;
          month <= 5;
          month++
        ) {
          map.set(
            `${academicYear.split("-")[1]}-${month}`,
            {
              month,
              year:
                Number(
                  academicYear.split(
                    "-"
                  )[1]
                ),
            }
          );
        }
      }

      return Array.from(
        map.values()
      ).sort((a, b) => {
        if (
          a.year !==
          b.year
        ) {
          return (
            a.year - b.year
          );
        }

        return (
          a.month -
          b.month
        );
      });
    }, [
      annualData,
      academicYear,
    ]);

  // =========================================================
  // THỐNG KÊ TUẦN
  // =========================================================

  const weeklyStatistics =
    useMemo(() => {
      let violationStudents = 0;
      let noViolationStudents = 0;

      let tot = 0;
      let kha = 0;
      let dat = 0;
      let chuaDat = 0;

      students.forEach(
        (student) => {
          const record =
            getWeeklyScore(
              student,
              Number(
                selectedWeek
              )
            );

          const groups =
            record?.groupViolations ||
            {};

          const hasViolation =
            Number(
              record?.totalConductViolations ??
                0
            ) > 0 ||
            Number(
              groups.S1 ?? 0
            ) > 0;

          if (
            hasViolation
          ) {
            violationStudents++;
          } else {
            noViolationStudents++;
          }

          const classification =
            getWeeklyClassification(
              record?.finalScore
            );

          if (
            classification ===
            "Tốt"
          )
            tot++;

          if (
            classification ===
            "Khá"
          )
            kha++;

          if (
            classification ===
            "Đạt"
          )
            dat++;

          if (
            classification ===
            "Chưa đạt"
          )
            chuaDat++;
        }
      );

      return {
        violationStudents,
        noViolationStudents,
        tot,
        kha,
        dat,
        chuaDat,
      };
    }, [
      students,
      weeklyData,
      selectedWeek,
    ]);

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
                    }}
                  >
                    Họ và tên
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                    }}
                  >
                    Tuần
                  </TableCell>

                  {[
                    "N1",
                    "N2",
                    "N3",
                    "N4",
                    "N5",
                    "S1",
                  ].map(
                    (code) => (
                      <TableCell
                        key={code}
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        {code}
                      </TableCell>
                    )
                  )}

                  <TableCell
                    align="center"
                    sx={{
                      fontWeight:
                        "bold",
                    }}
                  >
                    Tổng lỗi
                  </TableCell>

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
                </TableRow>
              </TableHead>

              <TableBody>
                {students.map(
                  (
                    student,
                    index
                  ) => {
                    const record =
                      getWeeklyScore(
                        student,
                        Number(
                          selectedWeek
                        )
                      );

                    const groups =
                      record?.groupViolations ||
                      {};

                    const score =
                      record?.finalScore ??
                      100;

                    const total =
                      Number(
                        record?.totalConductViolations ??
                          0
                      ) +
                      Number(
                        groups.S1 ?? 0
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

                        <TableCell
                          align="center"
                          sx={{
                            fontWeight:
                              Number(
                                groups.S1 ??
                                  0
                              ) > 0
                                ? "bold"
                                : "normal",
                            color:
                              Number(
                                groups.S1 ??
                                  0
                              ) > 0
                                ? "#d32f2f"
                                : "inherit",
                          }}
                        >
                          {groups.S1 ??
                            0}
                        </TableCell>

                        <TableCell align="center">
                          {total}
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
                            getWeeklyClassification(
                              score
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* =================================================
              THỐNG KÊ
          ================================================= */}

          <Paper
            elevation={2}
            sx={{
              mt: 2,
              p: 2,
            }}
          >
            <Typography
              fontWeight="bold"
              sx={{
                mb: 1,
              }}
            >
              THỐNG KÊ TUẦN{" "}
              {selectedWeek}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexWrap:
                  "wrap",
              }}
            >
              <Typography>
                Tổng số HS:{" "}
                <strong>
                  {students.length}
                </strong>
              </Typography>

              <Typography
                sx={{
                  color:
                    "#d32f2f",
                }}
              >
                HS có vi phạm:{" "}
                <strong>
                  {
                    weeklyStatistics.violationStudents
                  }
                </strong>
              </Typography>

              <Typography
                sx={{
                  color:
                    "#2e7d32",
                }}
              >
                HS không vi phạm:{" "}
                <strong>
                  {
                    weeklyStatistics.noViolationStudents
                  }
                </strong>
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexWrap:
                  "wrap",
                mt: 1,
              }}
            >
              <Typography>
                Tốt:{" "}
                <strong>
                  {
                    weeklyStatistics.tot
                  }
                </strong>
              </Typography>

              <Typography>
                Khá:{" "}
                <strong>
                  {
                    weeklyStatistics.kha
                  }
                </strong>
              </Typography>

              <Typography>
                Đạt:{" "}
                <strong>
                  {
                    weeklyStatistics.dat
                  }
                </strong>
              </Typography>

              <Typography>
                Chưa đạt:{" "}
                <strong>
                  {
                    weeklyStatistics.chuaDat
                  }
                </strong>
              </Typography>
            </Box>
          </Paper>

          {/* =================================================
              CHÚ THÍCH
          ================================================= */}

          <Paper
            elevation={1}
            sx={{
              mt: 2,
              p: 2,
            }}
          >
            <Typography
              fontWeight="bold"
              sx={{
                mb: 1,
              }}
            >
              CHÚ THÍCH NHÓM VI PHẠM
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                gap: 1,
              }}
            >
              <Typography>
                <strong>N1:</strong>{" "}
                Chuyên cần, đồng
                phục, tác phong
              </Typography>

              <Typography>
                <strong>N2:</strong>{" "}
                Vệ sinh, trực nhật,
                xếp hàng, chào cờ,
                sinh hoạt tập thể
              </Typography>

              <Typography>
                <strong>N3:</strong>{" "}
                Thiết bị, điện
                thoại, trật tự học
                tập
              </Typography>

              <Typography>
                <strong>N4:</strong>{" "}
                Bảo quản cơ sở vật
                chất
              </Typography>

              <Typography>
                <strong>N5:</strong>{" "}
                Các vi phạm nội quy
                khác
              </Typography>

              <Typography>
                <strong>S1:</strong>{" "}
                Vi phạm đặc biệt
                nghiêm trọng
              </Typography>
            </Box>
          </Paper>
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

      if (
        monthWeekNumbers.length ===
        0
      ) {
        return (
          <Paper
            sx={{
              p: 4,
              textAlign:
                "center",
            }}
          >
            <Typography color="text.secondary">
              Chưa xác định được
              các tuần của tháng này.
            </Typography>
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
                300 +
                monthWeekNumbers.length *
                  150,
            }}
          >
            <TableHead>
              {/* HÀNG 1 */}
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
                  }}
                >
                  STT
                </TableCell>

                <TableCell
                  rowSpan={2}
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 180,
                  }}
                >
                  Họ và tên
                </TableCell>

                {monthWeekNumbers.map(
                  (week) => (
                    <TableCell
                      key={week}
                      colSpan={2}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                      }}
                    >
                      Tuần {week}
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
                  }}
                >
                  Xếp loại
                  tháng
                </TableCell>
              </TableRow>

              {/* HÀNG 2 */}
              <TableRow
                sx={{
                  backgroundColor:
                    "#e3f2fd",
                }}
              >
                {monthWeekNumbers.map(
                  (week) => (
                    <>
                      <TableCell
                        key={`${week}-score`}
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                          minWidth: 75,
                        }}
                      >
                        Điểm
                      </TableCell>

                      <TableCell
                        key={`${week}-classification`}
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                          minWidth: 75,
                        }}
                      >
                        Xếp loại
                      </TableCell>
                    </>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map(
                (
                  student,
                  index
                ) => {
                  const monthClassification =
                    getStudentMonthClassification(
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

                      {monthWeekNumbers.map(
                        (week) => {
                          const record =
                            getWeeklyScore(
                              student,
                              week
                            );

                          const score =
                            record?.finalScore;

                          const classification =
                            record
                              ? getWeeklyClassification(
                                  score
                                )
                              : "";

                          return (
                            <>
                              <TableCell
                                key={`${student._id}-${week}-score`}
                                align="center"
                              >
                                {record
                                  ? formatScore(
                                      score
                                    )
                                  : "-"}
                              </TableCell>

                              <TableCell
                                key={`${student._id}-${week}-classification`}
                                align="center"
                              >
                                {renderClassification(
                                  classification
                                )}
                              </TableCell>
                            </>
                          );
                        }
                      )}

                      <TableCell
                        align="center"
                      >
                        {renderClassification(
                          monthClassification
                        )}
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
                    minWidth: 180,
                  }}
                >
                  Họ và tên
                </TableCell>

                {annualMonths.map(
                  (item) => (
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
              </TableRow>
            </TableHead>

            <TableBody>
              {students.map(
                (
                  student,
                  index
                ) => {
                  const record =
                    annualData.find(
                      (item) =>
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
                        (period) => {
                          const month =
                            record?.months?.find(
                              (item) =>
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
          3 NÚT
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
            flexWrap:
              "wrap",
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
            gridTemplateColumns:
              {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md:
                  viewMode ===
                  "year"
                    ? "1fr 1fr auto"
                    : "1fr 1fr auto",
              },
            gap: 1.5,
            alignItems:
              "center",
          }}
        >
          {/* TUẦN */}

          {viewMode ===
            "week" && (
            <>
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
                ) : (
                  weekNumbers.map(
                    (week) => (
                      <MenuItem
                        key={week}
                        value={week}
                      >
                        Tuần {week}
                      </MenuItem>
                    )
                  )
                )}
              </TextField>

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
                    (cls) => (
                      <MenuItem
                        key={
                          cls._id
                        }
                        value={
                          cls.className
                        }
                      >
                        {cls.className}
                      </MenuItem>
                    )
                  )
                )}
              </TextField>
            </>
          )}

          {/* THÁNG */}

          {viewMode ===
            "month" && (
            <>
              <TextField
                select
                label="Tháng"
                value={
                  selectedMonth
                }
                onChange={(e) =>
                  setSelectedMonth(
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
                  Chọn tháng
                </MenuItem>

                {Array.from(
                  {
                    length: 12,
                  },
                  (
                    _,
                    index
                  ) => (
                    <MenuItem
                      key={
                        index + 1
                      }
                      value={
                        index + 1
                      }
                    >
                      Tháng{" "}
                      {index + 1}
                    </MenuItem>
                  )
                )}
              </TextField>

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
                    (cls) => (
                      <MenuItem
                        key={
                          cls._id
                        }
                        value={
                          cls.className
                        }
                      >
                        {cls.className}
                      </MenuItem>
                    )
                  )
                )}
              </TextField>
            </>
          )}

          {/* NĂM */}

          {viewMode ===
            "year" && (
            <>
              <TextField
                label="Năm học"
                value={
                  academicYear
                }
                onChange={(e) =>
                  setAcademicYear(
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
                    (cls) => (
                      <MenuItem
                        key={
                          cls._id
                        }
                        value={
                          cls.className
                        }
                      >
                        {cls.className}
                      </MenuItem>
                    )
                  )
                )}
              </TextField>
            </>
          )}

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
          THÔNG TIN
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

          <Typography color="text.secondary">
            Tổng số học sinh:{" "}
            <strong>
              {students.length}
            </strong>
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            {viewMode ===
              "week" &&
              `Tuần ${selectedWeek}`}

            {viewMode ===
              "month" &&
              selectedMonth !==
                "" &&
              `Tháng ${selectedMonth}`}

            {viewMode ===
              "year" &&
              `Năm học ${academicYear}`}
          </Typography>
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
            (prev) => ({
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
              (prev) => ({
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
