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
// XÁC ĐỊNH NĂM CỦA THÁNG TRONG NĂM HỌC
// VD:
// 2026-2027:
// T9-T12 -> 2026
// T1-T8  -> 2027
// =========================================================

const getYearOfMonth = (
  academicYear: string,
  month: number
) => {
  const parts =
    academicYear.split("-");

  const startYear =
    Number(parts[0]);

  if (!Number.isFinite(startYear)) {
    return new Date().getFullYear();
  }

  return month >= 9
    ? startYear
    : startYear + 1;
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

  const [selectedClass, setSelectedClass] =
    useState("");

  const [academicYear, setAcademicYear] =
    useState("");

  const [selectedWeek, setSelectedWeek] =
    useState<number | "">("");

  const [selectedMonth, setSelectedMonth] =
    useState<number | "">("");

  // -------------------------------------------------------
  // DANH SÁCH
  // -------------------------------------------------------

  const [classes, setClasses] =
    useState<ClassOption[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [availableWeeks, setAvailableWeeks] =
    useState<number[]>([]);

  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

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

  const [loadingWeeks, setLoadingWeeks] =
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
  // LOAD LỚP
  // =========================================================

  const loadClasses = useCallback(
    async () => {
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
              _id: String(cls._id),
              className: String(
                cls.className
              ).trim(),
              teacher: cls.teacher,
            }))
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
    },
    []
  );

  // =========================================================
  // LOAD DANH SÁCH TUẦN
  // =========================================================

  const loadAvailableWeeks =
    useCallback(async () => {
      setLoadingWeeks(true);

      try {
        const res = await api.get(
          "/api/academic-weeks/study-weeks"
        );

        const data =
          Array.isArray(res.data)
            ? res.data
            : [];

        const weeks = data
          .map((item: any) =>
            Number(
              item.weekNumber ??
                item.week ??
                item.number
            )
          )
          .filter(
            (week: number) =>
              Number.isInteger(week) &&
              week > 0
          );

        setAvailableWeeks(
          Array.from(
            new Set(weeks)
          ).sort(
            (a, b) => a - b
          )
        );
      } catch (error) {
        console.error(
          "Lỗi tải danh sách tuần:",
          error
        );

        setAvailableWeeks([]);

        setSnackbar({
          open: true,
          message:
            "Không thể tải danh sách tuần",
          severity: "error",
        });
      } finally {
        setLoadingWeeks(false);
      }
    }, []);

  // =========================================================
  // LOAD HỌC SINH
  // =========================================================

  const loadStudents = useCallback(
    async () => {
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
    },
    [selectedClass]
  );

  // =========================================================
  // LOAD BAN ĐẦU
  // =========================================================

  useEffect(() => {
    loadClasses();
    loadAvailableWeeks();
  }, [
    loadClasses,
    loadAvailableWeeks,
  ]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =========================================================
  // TẢI TUẦN
  // =========================================================

  const loadWeeklyData =
    useCallback(async () => {
      if (!selectedClass) {
        return;
      }

      if (selectedWeek === "") {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn tuần",
          severity: "warning",
        });

        return;
      }

      setLoadingData(true);

      try {
        const res = await api.get(
          "/api/student-conduct-scores",
          {
            params: {
              className:
                selectedClass,
              academicYear,
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
      academicYear,
      selectedWeek,
    ]);

  // =========================================================
  // TẢI THÁNG
  // =========================================================

  const loadMonthlyData =
    useCallback(async () => {
      if (!selectedClass) {
        return;
      }

      if (selectedMonth === "") {
        setSnackbar({
          open: true,
          message:
            "Vui lòng chọn tháng",
          severity: "warning",
        });

        return;
      }

      setLoadingData(true);

      try {
        const month =
          Number(selectedMonth);

        const year =
          getYearOfMonth(
            academicYear,
            month
          );

        const res = await api.get(
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
          Array.isArray(res.data)
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
      academicYear,
      selectedMonth,
    ]);

  // =========================================================
  // TẢI NĂM
  // =========================================================

  const loadAnnualData =
    useCallback(async () => {
      if (!selectedClass) {
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
              academicYear,
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
  // XEM DỮ LIỆU
  // =========================================================

  const handleView = async () => {
    if (!academicYear) {
      setSnackbar({
        open: true,
        message:
          "Vui lòng nhập năm học",
        severity: "warning",
      });

      return;
    }

    if (!selectedClass) {
      setSnackbar({
        open: true,
        message:
          "Vui lòng chọn lớp",
        severity: "warning",
      });

      return;
    }

    if (viewMode === "week") {
      await loadWeeklyData();
      return;
    }

    if (viewMode === "month") {
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

    if (mode !== "week") {
      setSelectedWeek("");
    }

    if (mode !== "month") {
      setSelectedMonth("");
    }
  };

  // =========================================================
  // CÁC THÁNG CÓ TRONG DỮ LIỆU NĂM
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

              if (!map.has(key)) {
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
    }, [annualData]);

  // =========================================================
  // TÌM ĐIỂM TUẦN
  // =========================================================

  const getWeeklyScore = (
    student: Student
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
          )
    );
  };

  // =========================================================
  // TÌM ĐIỂM THÁNG
  // =========================================================

  const getMonthlyScore = (
    student: Student
  ) => {
    return monthlyData.find(
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
  };

  // =========================================================
  // TÌM ĐIỂM NĂM
  // =========================================================

  const getAnnualScore = (
    student: Student
  ) => {
    return annualData.find(
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
  };

  // =========================================================
  // BẢNG TUẦN
  // =========================================================

  const renderWeekTable = () => {
    if (
      loadingStudents ||
      loadingData
    ) {
      return (
        <Paper
          sx={{
            p: 5,
            textAlign: "center",
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
          overflowX: "auto",
        }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 850,
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
              ].map(
                (title, index) => (
                  <TableCell
                    key={title}
                    align={
                      index === 1
                        ? "left"
                        : "center"
                    }
                    sx={{
                      fontWeight:
                        "bold",
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
                student,
                index
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
                      {record?.weekNumber ??
                        selectedWeek}
                    </TableCell>

                    <TableCell align="center">
                      {groups.N1 ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {groups.N2 ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {groups.N3 ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {groups.N4 ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {groups.N5 ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {groups.S1 ?? 0}
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
  // BẢNG THÁNG
  // =========================================================

  const renderMonthTable = () => {
    if (
      loadingStudents ||
      loadingData
    ) {
      return (
        <Paper
          sx={{
            p: 5,
            textAlign: "center",
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
          overflowX: "auto",
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
                Tháng
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Các tuần
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Tốt
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Khá
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Đạt
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Chưa đạt
              </TableCell>

              <TableCell
                align="center"
                sx={{
                  fontWeight:
                    "bold",
                }}
              >
                Xếp loại tháng
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
                  getMonthlyScore(
                    student
                  );

                const counts =
                  record?.classificationCounts ||
                  {};

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
                      {record
                        ? `${record.month}/${record.year}`
                        : selectedMonth !==
                          ""
                        ? `${selectedMonth}/${getYearOfMonth(
                            academicYear,
                            Number(
                              selectedMonth
                            )
                          )}`
                        : "-"}
                    </TableCell>

                    <TableCell align="center">
                      {record?.weekNumbers
                        ?.length
                        ? record.weekNumbers.join(
                            ", "
                          )
                        : "-"}
                    </TableCell>

                    <TableCell align="center">
                      {counts.tot ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {counts.kha ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {counts.dat ?? 0}
                    </TableCell>

                    <TableCell align="center">
                      {counts.chuaDat ??
                        0}
                    </TableCell>

                    <TableCell align="center">
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
  // BẢNG NĂM
  // =========================================================

  const renderYearTable = () => {
    if (
      loadingStudents ||
      loadingData
    ) {
      return (
        <Paper
          sx={{
            p: 5,
            textAlign: "center",
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
          overflowX: "auto",
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
        maxWidth: "1800px",
        mx: "auto",
        py: 3,
        px: {
          xs: 1,
          md: 3,
        },
      }}
    >
      {/* TIÊU ĐỀ */}

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

      {/* CHẾ ĐỘ */}

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

      {/* BỘ LỌC */}

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
              sm: "repeat(2, 1fr)",
              md:
                viewMode === "week"
                  ? "1fr 1fr 1fr auto"
                  : "1fr 1fr 1fr auto",
            },
            gap: 1.5,
            alignItems:
              "center",
          }}
        >
          {/* NĂM HỌC */}

          <TextField
            label="Năm học"
            value={academicYear}
            onChange={(e) =>
              setAcademicYear(
                e.target.value
              )
            }
            placeholder="VD: 2026-2027"
            size="small"
            fullWidth
          />

          {/* LỚP */}

          <TextField
            select
            label="Chọn lớp"
            value={selectedClass}
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

          {/* TUẦN */}

          {viewMode ===
            "week" && (
            <TextField
              select
              label="Tuần"
              value={selectedWeek}
              onChange={(e) =>
                setSelectedWeek(
                  e.target.value ===
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

              {loadingWeeks ? (
                <MenuItem disabled>
                  Đang tải tuần...
                </MenuItem>
              ) : (
                availableWeeks.map(
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
          )}

          {/* THÁNG */}

          {viewMode ===
            "month" && (
            <TextField
              select
              label="Tháng"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value ===
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
                (_, index) => (
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
          )}

          {/* NĂM */}

          {viewMode ===
            "year" && (
            <Box />
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

      {/* THÔNG TIN */}

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
            Lớp {selectedClass}
          </Typography>

          <Typography
            color="text.secondary"
          >
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
        </Box>
      )}

      {/* BẢNG */}

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

      {/* SNACKBAR */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
