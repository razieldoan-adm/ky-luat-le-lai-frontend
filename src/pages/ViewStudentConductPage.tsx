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

// =========================================================
// CẤU HÌNH NĂM HỌC HIỆN TẠI
// =========================================================

const CURRENT_ACADEMIC_YEAR = "2026-2027";

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
}

interface MonthlyWeek {
  weekNumber?: number;
  week?: number;
  score?: number;
  finalScore?: number;
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

  weeks?: MonthlyWeek[];

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
    value === null ||
    Number.isNaN(Number(value))
  ) {
    return "-";
  }

  return Number.isInteger(Number(value))
    ? String(value)
    : Number(value).toFixed(1);
};

// =========================================================
// DANH SÁCH THÁNG NĂM HỌC
// 09/26 -> 05/27
// =========================================================

const SCHOOL_MONTHS = [
  {
    month: 9,
    year: 2026,
    label: "09/26",
  },
  {
    month: 10,
    year: 2026,
    label: "10/26",
  },
  {
    month: 11,
    year: 2026,
    label: "11/26",
  },
  {
    month: 12,
    year: 2026,
    label: "12/26",
  },
  {
    month: 1,
    year: 2027,
    label: "01/27",
  },
  {
    month: 2,
    year: 2027,
    label: "02/27",
  },
  {
    month: 3,
    year: 2027,
    label: "03/27",
  },
  {
    month: 4,
    year: 2027,
    label: "04/27",
  },
  {
    month: 5,
    year: 2027,
    label: "05/27",
  },
];

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

  const [selectedWeek, setSelectedWeek] =
    useState<number | "">("");

  const [selectedMonth, setSelectedMonth] =
    useState<number | "">("");

  const [selectedMonthYear, setSelectedMonthYear] =
    useState<number | "">("");

  const [selectedAnnualYear, setSelectedAnnualYear] =
    useState(CURRENT_ACADEMIC_YEAR);

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

            map.set(key, student);
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
  }, [loadClasses]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =========================================================
  // TẢI ĐIỂM TUẦN
  // =========================================================

  const loadWeeklyData =
    useCallback(async () => {
      if (!selectedClass) {
        return;
      }

      setLoadingData(true);

      try {
        const params: Record<
          string,
          string | number
        > = {
          className:
            selectedClass,
          academicYear:
            CURRENT_ACADEMIC_YEAR,
        };

        if (selectedWeek !== "") {
          params.weekNumber =
            Number(selectedWeek);
        }

        const res = await api.get(
          "/api/student-conduct-scores",
          {
            params,
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
      selectedWeek,
    ]);

  // =========================================================
  // TẢI ĐIỂM THÁNG
  // =========================================================

  const loadMonthlyData =
    useCallback(async () => {
      if (!selectedClass) {
        return;
      }

      if (
        selectedMonth === "" ||
        selectedMonthYear === ""
      ) {
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
        const res = await api.get(
          "/api/student-monthly-conduct",
          {
            params: {
              className:
                selectedClass,
              academicYear:
                CURRENT_ACADEMIC_YEAR,
              month:
                Number(selectedMonth),
              year:
                Number(
                  selectedMonthYear
                ),
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
      selectedMonth,
      selectedMonthYear,
    ]);

  // =========================================================
  // TẢI ĐIỂM NĂM
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
              academicYear:
                selectedAnnualYear,
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
      selectedAnnualYear,
    ]);

  // =========================================================
  // XEM
  // =========================================================

  const handleView = async () => {
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
  };

  // =========================================================
  // DANH SÁCH TUẦN
  // =========================================================

  const weekNumbers = useMemo(() => {
    const set =
      new Set<number>();

    weeklyData.forEach(
      (item) => {
        const week =
          Number(
            item.weekNumber
          );

        if (
          Number.isFinite(
            week
          )
        ) {
          set.add(week);
        }
      }
    );

    return Array.from(
      set
    ).sort(
      (
        a: number,
        b: number
      ) => a - b
    );
  }, [weeklyData]);

  // =========================================================
  // TÌM ĐIỂM TUẦN
  // =========================================================

  const getWeeklyScore =
    (
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
            ) &&
          (
            selectedWeek ===
              "" ||
            Number(
              item.weekNumber
            ) ===
              Number(
                selectedWeek
              )
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

  const getAnnualScore =
    (
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
  // THỐNG KÊ TUẦN
  // =========================================================

  const weeklyStatistics =
    useMemo(() => {
      let violationStudents = 0;
      let noViolationStudents = 0;
      let seriousStudents = 0;

      weeklyData.forEach(
        (item) => {
          const total =
            Number(
              item.totalConductViolations
            ) || 0;

          if (total > 0) {
            violationStudents++;
          } else {
            noViolationStudents++;
          }

          if (
            item.hasSeriousViolation ||
            (Number(
              item.groupViolations?.S1
            ) || 0) > 0
          ) {
            seriousStudents++;
          }
        }
      );

      return {
        violationStudents,
        noViolationStudents,
        seriousStudents,
        totalRecords:
          weeklyData.length,
      };
    }, [weeklyData]);

  // =========================================================
  // CHÚ THÍCH NHÓM VI PHẠM
  // =========================================================

  const renderViolationLegend =
    () => (
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 2,
          backgroundColor:
            "#f8fbff",
        }}
      >
        <Typography
          fontWeight="bold"
          sx={{ mb: 1 }}
        >
          Chú thích nhóm vi phạm
        </Typography>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={{
            xs: 0.5,
            sm: 2,
          }}
          flexWrap="wrap"
        >
          <Typography variant="body2">
            <strong>N1:</strong>{" "}
            Vi phạm nhóm N1
          </Typography>

          <Typography variant="body2">
            <strong>N2:</strong>{" "}
            Vi phạm nhóm N2
          </Typography>

          <Typography variant="body2">
            <strong>N3:</strong>{" "}
            Vi phạm nhóm N3
          </Typography>

          <Typography variant="body2">
            <strong>N4:</strong>{" "}
            Vi phạm nhóm N4
          </Typography>

          <Typography variant="body2">
            <strong>N5:</strong>{" "}
            Vi phạm nhóm N5
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontWeight: "bold",
            }}
          >
            <strong>S1:</strong>{" "}
            Vi phạm nghiêm trọng
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Mỗi vi phạm N1–N5 bị trừ
          1 điểm. S1 không trừ điểm
          nhưng được ghi nhận là vi
          phạm nghiêm trọng.
        </Typography>
      </Paper>
    );

  // =========================================================
  // RENDER THỐNG KÊ TUẦN
  // =========================================================

  const renderWeeklyStatistics =
    () => (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(4, 1fr)",
          },
          gap: 1.5,
          mb: 2,
        }}
      >
        <Paper
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
            variant="h6"
            fontWeight="bold"
          >
            {
              weeklyStatistics.totalRecords
            }
          </Typography>
        </Paper>

        <Paper
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
            variant="h6"
            fontWeight="bold"
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
            variant="h6"
            fontWeight="bold"
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
            variant="h6"
            fontWeight="bold"
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
          {renderViolationLegend()}
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
                minWidth: 1050,
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
                      title: string,
                      index: number
                    ) => (
                      <TableCell
                        key={title}
                        align={
                          index ===
                          1
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
                            selectedWeek ??
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

                        <TableCell
                          align="center"
                          sx={{
                            fontWeight:
                              groups.S1
                                ? "bold"
                                : "normal",
                            color:
                              groups.S1
                                ? "#d32f2f"
                                : "inherit",
                          }}
                        >
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
  // LẤY ĐIỂM TUẦN TRONG BẢN GHI THÁNG
  // =========================================================

  const getMonthWeekData = (
    record: MonthlyConduct,
    weekNumber: number
  ): MonthlyWeek | undefined => {
    if (!record.weeks) {
      return undefined;
    }

    return record.weeks.find(
      (
        week: MonthlyWeek
      ) =>
        Number(
          week.weekNumber ??
            week.week
        ) === weekNumber
    );
  };

  // =========================================================
  // LẤY CÁC TUẦN CÓ TRONG THÁNG
  // =========================================================

  const monthWeekNumbers =
    useMemo(() => {
      const set =
        new Set<number>();

      monthlyData.forEach(
        (record) => {
          record.weekNumbers?.forEach(
            (week) => {
              const value =
                Number(week);

              if (
                Number.isFinite(
                  value
                )
              ) {
                set.add(value);
              }
            }
          );

          record.weeks?.forEach(
            (week) => {
              const value =
                Number(
                  week.weekNumber ??
                    week.week
                );

              if (
                Number.isFinite(
                  value
                )
              ) {
                set.add(value);
              }
            }
          );
        }
      );

      return Array.from(
        set
      ).sort(
        (
          a: number,
          b: number
        ) => a - b
      );
    }, [monthlyData]);

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

      const weekColumns =
        monthWeekNumbers;

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
                900 +
                weekColumns.length *
                  150,
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

                {weekColumns.map(
                  (
                    week: number
                  ) => (
                    <TableCell
                      key={week}
                      colSpan={2}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                        borderLeft:
                          "1px solid rgba(0,0,0,0.15)",
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

              <TableRow
                sx={{
                  backgroundColor:
                    "#dceeff",
                }}
              >
                {weekColumns.flatMap(
                  (
                    week: number
                  ) => [
                    <TableCell
                      key={`${week}-score`}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                      }}
                    >
                      Điểm
                    </TableCell>,

                    <TableCell
                      key={`${week}-classification`}
                      align="center"
                      sx={{
                        fontWeight:
                          "bold",
                      }}
                    >
                      Xếp loại
                    </TableCell>,
                  ]
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
                    getMonthlyScore(
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

                      {weekColumns.flatMap(
                        (
                          week: number
                        ) => {
                          const weekData =
                            record
                              ? getMonthWeekData(
                                  record,
                                  week
                                )
                              : undefined;

                          const score =
                            weekData?.score ??
                            weekData?.finalScore;

                          return [
                            <TableCell
                              key={`${student._id}-${week}-score`}
                              align="center"
                            >
                              {formatScore(
                                score
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
  // CÁC THÁNG CÓ DỮ LIỆU NĂM
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
          student: AnnualConduct
        ) => {
          student.months?.forEach(
            (
              item: AnnualMonth
            ) => {
              const key =
                `${item.year}-${item.month}`;

              if (!map.has(key)) {
                map.set(key, {
                  month:
                    Number(
                      item.month
                    ),
                  year:
                    Number(
                      item.year
                    ),
                });
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
    }, [annualData]);

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
                900 +
                annualMonths.length *
                  100,
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
            gridTemplateColumns: {
              xs: "1fr",
              sm:
                viewMode ===
                "month"
                  ? "1fr 1fr"
                  : "1fr 1fr",
              md:
                viewMode ===
                "week"
                  ? "1fr 1fr 1fr auto"
                  : viewMode ===
                    "month"
                  ? "1fr 1fr 1fr auto"
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
                Tất cả tuần
              </MenuItem>

              {weekNumbers.map(
                (
                  week: number
                ) => (
                  <MenuItem
                    key={week}
                    value={week}
                  >
                    Tuần {week}
                  </MenuItem>
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
                  ? `${selectedMonthYear}-${selectedMonth}`
                  : ""
              }
              onChange={(e) => {
                const value =
                  e.target.value;

                if (!value) {
                  setSelectedMonth(
                    ""
                  );
                  setSelectedMonthYear(
                    ""
                  );
                  return;
                }

                const [
                  year,
                  month,
                ] =
                  value.split(
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
              <MenuItem value="">
                Chọn tháng
              </MenuItem>

              {SCHOOL_MONTHS.map(
                (
                  item: {
                    month: number;
                    year: number;
                    label: string;
                  }
                ) => (
                  <MenuItem
                    key={`${item.year}-${item.month}`}
                    value={`${item.year}-${item.month}`}
                  >
                    {item.label}
                  </MenuItem>
                )
              )}
            </TextField>
          )}

          {/* NĂM */}

          {viewMode ===
            "year" && (
            <TextField
              select
              label="Năm học"
              value={
                selectedAnnualYear
              }
              onChange={(e) =>
                setSelectedAnnualYear(
                  e.target.value
                )
              }
              size="small"
              fullWidth
            >
              <MenuItem value="2026-2027">
                2026-2027
              </MenuItem>

              <MenuItem value="2025-2026">
                2025-2026
              </MenuItem>

              <MenuItem value="2024-2025">
                2024-2025
              </MenuItem>
            </TextField>
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
