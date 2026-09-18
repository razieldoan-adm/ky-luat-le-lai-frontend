import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import FileDownload from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx-js-style";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
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
    .replace(/Ä‘/g, "d");

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
    case "Tá»‘t":
      return "#2e7d32";

    case "KhÃ¡":
      return "#1565c0";

    case "Äáº¡t":
      return "#ed6c02";

    case "ChÆ°a Ä‘áº¡t":
      return "#d32f2f";

    default:
      return undefined;
  }
};

const VIOLATION_HIGHLIGHT_COLOR = "#e8eaf6";

const getConductRowStyle = (
  classification: string,
  deduction: number = 0
) => {
  const value = classification
    .trim()
    .toLowerCase();

  // Tá»‘t nhÆ°ng cÃ³ bá»‹ trá»« Ä‘iá»ƒm â†’ Ä‘Ã¡nh dáº¥u lÃ  cÃ³ vi pháº¡m.
  // Táº¥t cáº£ má»©c trá»« > 0 dÃ¹ng Ä‘Ãºng má»™t mÃ u.
  if (value === "tá»‘t") {
    return deduction > 0
      ? {
          backgroundColor:
            VIOLATION_HIGHLIGHT_COLOR,
        }
      : {};
  }

  if (value === "khÃ¡") {
    return {
      backgroundColor: "#fff3cd",
    };
  }

  if (value === "Ä‘áº¡t") {
    return {
      backgroundColor: "#ffe0b2",
    };
  }

  if (value === "chÆ°a Ä‘áº¡t") {
    return {
      backgroundColor: "#ffcdd2",
    };
  }

  return {};
};

const getExcelConductFillColor = (
  classification: string,
  deduction: number = 0
): string | undefined => {
  const value = classification
    .trim()
    .toLowerCase();

  if (value === "tá»‘t") {
    return deduction > 0
      ? VIOLATION_HIGHLIGHT_COLOR.replace("#", "")
      : undefined;
  }

  if (value === "khÃ¡") {
    return "FFF3CD";
  }

  if (value === "Ä‘áº¡t") {
    return "FFE0B2";
  }

  if (value === "chÆ°a Ä‘áº¡t") {
    return "FFCDD2";
  }

  return undefined;
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
    return "Tá»‘t";
  }

  if (score >= 70) {
    return "KhÃ¡";
  }

  if (score >= 50) {
    return "Äáº¡t";
  }

  return "ChÆ°a Ä‘áº¡t";
};

const lowerClassificationOneLevel = (
  classification: string
): string => {
  switch (classification) {
    case "Tá»‘t":
      return "KhÃ¡";

    case "KhÃ¡":
      return "Äáº¡t";

    case "Äáº¡t":
      return "ChÆ°a Ä‘áº¡t";

    case "ChÆ°a Ä‘áº¡t":
      return "ChÆ°a Ä‘áº¡t";

    default:
      return classification;
  }
};
const getFinalWeeklyClassification = (
  score: number,
  hasSeriousViolation: boolean
): string => {
  const classification = getWeeklyClassification(score);

  if (hasSeriousViolation) {
    return lowerClassificationOneLevel(classification);
  }

  return classification;
};

const hasSeriousViolationGroup = (
  groupViolations?: WeeklyGroups
): boolean => {
  if (!groupViolations) return false;

  return Object.entries(groupViolations).some(
    ([groupCode, count]) =>
      groupCode.startsWith("S") &&
      Number(count ?? 0) > 0
  );
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
  
  const [exportDialogOpen, setExportDialogOpen] =
    useState(false);

  const [exportGrade, setExportGrade] =
    useState("");

  const [exportWeek, setExportWeek] =
    useState<number | "">("");
  
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
const getClassesByGrade = (grade: string) => {
  return classes.filter((item) =>
    String(item.className).startsWith(`${grade}`)
  );
};
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
        // Láº¤Y TUáº¦N HIá»†N Táº I
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
          "Lá»—i táº£i danh sÃ¡ch tuáº§n:",
          error
        );

        setStudyWeeks([]);

        setSnackbar({
          open: true,
          message:
            "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch tuáº§n há»c",
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
          "Lá»—i táº£i danh sÃ¡ch lá»›p:",
          error
        );

        setClasses([]);

        setSnackbar({
          open: true,
          message:
            "KhÃ´ng thá»ƒ táº£i danh sÃ¡ch lá»›p",
          severity: "error",
        });
      } finally {
        setLoadingClasses(false);
      }
    }, []);
  // =========================================================
  // DIALOG XUáº¤T EXCEL
  // =========================================================

const openExportDialog = () => {
  setExportGrade("");
  setExportWeek("");
  setExportDialogOpen(true);

};
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

  // Náº¿u trÃ¹ng tÃªn â†’ xÃ©t toÃ n bá»™ há» tÃªn
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
          "Lá»—i táº£i há»c sinh:",
          error
        );

        setStudents([]);

        setSnackbar({
          open: true,
          message:
            `KhÃ´ng thá»ƒ táº£i há»c sinh lá»›p ${selectedClass}`,
          severity: "error",
        });
      } finally {
        setLoadingStudents(false);
      }
    }, [selectedClass]);
// =========================================================
// Láº¤Y DANH SÃCH Há»ŒC SINH 1 Lá»šP - DÃ™NG KHI XUáº¤T EXCEL
// =========================================================

const loadStudentsForExport = async (
  className: string
): Promise<Student[]> => {
  try {
    const res = await api.get(
      "/api/students/search",
      {
        params: {
          className,
        },
      }
    );

    const list: Student[] =
      Array.isArray(res.data)
        ? res.data
            .filter((item: unknown) => {
              const value =
                item as Record<string, unknown>;

              return Boolean(value.name);
            })
            .map((item: unknown) => {
              const value =
                item as Record<string, unknown>;

              return {
                _id: String(value._id ?? ""),
                name: String(value.name).trim(),
                className: String(
                  value.className ?? className
                ).trim(),
              };
            })
        : [];

    const unique =
      new Map<string, Student>();

    list.forEach((student: Student) => {
      const key =
        student._id ||
        `${normalizeName(
          student.name
        )}-${normalizeClass(
          student.className
        )}`;

      unique.set(key, student);
    });

    return Array.from(
      unique.values()
    ).sort((a: Student, b: Student) => {
      const getLastName = (name: string) => {
        const parts =
          name.trim().split(/\s+/);

        return (
          parts[parts.length - 1] || ""
        );
      };

      const nameA =
        getLastName(a.name);

      const nameB =
        getLastName(b.name);

      const compareName =
        nameA.localeCompare(
          nameB,
          "vi",
          {
            sensitivity: "base",
          }
        );

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
    });
  } catch (error) {
    console.error(
      `âŒ Lá»—i táº£i há»c sinh lá»›p ${className}:`,
      error
    );

    return [];
  }
};
  // =========================================================
// GHÃ‰P DANH SÃCH Há»ŒC SINH + Dá»® LIá»†U Háº NH KIá»‚M TUáº¦N
// =========================================================

const mergeStudentsWithWeeklyData = (
  studentsForExport: Student[],
  weeklyDataForExport: any[]
) => {
  return studentsForExport.map(
    (student, index) => {
      const conductData =
        weeklyDataForExport.find(
          (item) =>
            normalizeName(item.name) ===
              normalizeName(student.name) &&
            normalizeClass(item.className) ===
              normalizeClass(student.className)
        );
      return {
        stt: index + 1,

        name: student.name,

        className:
          student.className,

        conduct: conductData || null,
      };
    }
  );
};
  // =========================================================
// XUáº¤T EXCEL THEO KHá»I - Má»–I Lá»šP 1 SHEET
// =========================================================

const exportConductExcel = async () => {
  if (
    exportGrade === "" ||
    exportWeek === ""
  ) {
    return;
  }

  const weekNumber =
    Number(exportWeek);

  try {
    setLoadingData(true);

    const gradeClasses =
      getClassesByGrade(exportGrade);

    // Táº¡o workbook má»›i
    const workbook =
      XLSX.utils.book_new();

    for (const classItem of gradeClasses) {
      const className =
        classItem.className;

      // -----------------------------------------
      // Láº¤Y Há»ŒC SINH
      // -----------------------------------------

      const studentsForExport =
        await loadStudentsForExport(
          className
        );

      // -----------------------------------------
      // Láº¤Y Háº NH KIá»‚M
      // -----------------------------------------

      const weeklyDataForExport =
        await loadWeeklyDataForExport(
          className,
          weekNumber
        );

      // -----------------------------------------
      // GHÃ‰P Dá»® LIá»†U
      // -----------------------------------------

      const mergedData =
        mergeStudentsWithWeeklyData(
          studentsForExport,
          weeklyDataForExport
        );
      console.log(
  `ðŸ”Ž CONDUCT ${className}:`,
      mergedData[0]?.conduct
    );
// -----------------------------------------
// Táº O Dá»® LIá»†U SHEET
// -----------------------------------------

const sheetData = mergedData.map((item) => {
  const conduct = item.conduct;

  // ================================
  // ÄIá»‚M Äáº¦U
  // ================================
  const startScore = 100;

  // ================================
  // Sá» Láº¦N VI PHáº M
  // ================================
  const violationCount =
    conduct?.totalConductViolations ?? 0;

  // ================================
  // ÄIá»‚M TRá»ª
  // ================================
  const deduction =
    conduct?.totalDeduction ?? 0;

  return {
    "STT": item.stt,
    "Há»Œ VÃ€ TÃŠN": item.name,
    "Lá»šP": item.className,

    "ÄIá»‚M Äáº¦U": startScore,

    "VI PHáº M/Láº¦N":
      violationCount,

    "TRá»ª":
      deduction,

    // Máº·c Ä‘á»‹nh 0 Ä‘á»ƒ ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ sá»­a trá»±c tiáº¿p
    "VIá»†C Tá»T": 0,

    // Máº·c Ä‘á»‹nh 0
    "Cá»˜NG": 0,

    // Sáº½ thay báº±ng cÃ´ng thá»©c Excel sau
    "ÄIá»‚M CUá»I": null,

    // Sáº½ thay báº±ng cÃ´ng thá»©c Excel sau
    "Xáº¾P LOáº I": "",

    "GHI CHÃš": "",

    "S": 0,
  };
});


// =========================================================
// Táº O WORKSHEET
// =========================================================

const worksheet = XLSX.utils.aoa_to_sheet([]);

// =========================================================
// TIÃŠU Äá»€
// =========================================================

XLSX.utils.sheet_add_aoa(
  worksheet,
  [
    [
      `Báº¢NG THEO DÃ•I ÄIá»‚M RÃˆN LUYá»†N TUáº¦N ${weekNumber}`,
    ],
  ],
  {
    origin: "A1",
  }
);

// =========================================================
// THÃ”NG TIN Lá»šP + KHá»I
// =========================================================

XLSX.utils.sheet_add_aoa(
  worksheet,
  [
    [
      `Lá»›p: ${className}`,
      "",
      "",
      "",
      "",
      `Khá»‘i: ${exportGrade}`,
    ],
  ],
  {
    origin: "A2",
  }
);

// =========================================================
// Gá»˜P TIÃŠU Äá»€
// =========================================================

worksheet["!merges"] = [
  {
    s: { r: 0, c: 0 },
    e: { r: 0, c: 11 },
  },
];

// =========================================================
// THÃŠM Dá»® LIá»†U Há»ŒC SINH
// =========================================================

XLSX.utils.sheet_add_json(
  worksheet,
  sheetData,
  {
    origin: "A4",
    skipHeader: false,
  }
);
// =========================================================
// CÃ”NG THá»¨C ÄIá»‚M CUá»I + Xáº¾P LOáº I
// =========================================================

// DÃ²ng dá»¯ liá»‡u Ä‘áº§u tiÃªn lÃ  dÃ²ng 5
// VÃ¬:
// dÃ²ng 1 = tiÃªu Ä‘á»
// dÃ²ng 2 = thÃ´ng tin lá»›p
// dÃ²ng 3 = trá»‘ng
// dÃ²ng 4 = tiÃªu Ä‘á» cá»™t

for (let row = 5; row < 5 + sheetData.length; row++) {

  // -------------------------------------------------------
  // ÄIá»‚M CUá»I
  // = ÄIá»‚M Äáº¦U - TRá»ª + Cá»˜NG
  // D = ÄIá»‚M Äáº¦U
  // F = TRá»ª
  // H = Cá»˜NG
  // -------------------------------------------------------

  // -------------------------------------------------------
  // Xáº¾P LOáº I
  //
  // 90 - 100  = Tá»‘t
  // 70 - 89   = KhÃ¡
  // 50 - 69   = Äáº¡t
  // 0 - 49    = ChÆ°a Ä‘áº¡t
  // -------------------------------------------------------

  // LÆ°u Ã½: cá»™t L Ä‘Æ°á»£c táº¡o á»Ÿ Ä‘Ã¢y trong Ä‘Ãºng vÃ²ng láº·p
  // Ä‘á»ƒ dataIndex khÃ´ng bá»‹ sá»­ dá»¥ng ngoÃ i pháº¡m vi.
  const dataIndex = row - 5;

  const hasSeriousViolation =
    hasSeriousViolationGroup(
      mergedData[dataIndex]?.conduct?.groupViolations
    );

  // Cá»™t L: 1 = cÃ³ lá»—i nhÃ³m S, 0 = khÃ´ng cÃ³
  worksheet[`L${row}`] = {
    t: "n",
    v: hasSeriousViolation ? 1 : 0,
  };

  // Cá»™t I: ÄIá»‚M CUá»I
  worksheet[`I${row}`] = {
    t: "n",
    f: `D${row}-F${row}+H${row}`,
  };

  // Cá»™t J: Xáº¾P LOáº I
  // CÃ³ lá»—i nhÃ³m S thÃ¬ háº¡ Ä‘Ãºng 1 báº­c.
  worksheet[`J${row}`] = {
    t: "s",
    f: `IF(I${row}>=90,IF(L${row}=1,"KhÃ¡","Tá»‘t"),IF(I${row}>=70,IF(L${row}=1,"Äáº¡t","KhÃ¡"),IF(I${row}>=50,IF(L${row}=1,"ChÆ°a Ä‘áº¡t","Äáº¡t"),"ChÆ°a Ä‘áº¡t")))`,
  };
}

// =========================================================
// Äá»˜ Rá»˜NG Cá»˜T
// =========================================================

worksheet["!cols"] = [
  { wch: 8 },   // A - STT
  { wch: 30 },  // B - Há»Œ VÃ€ TÃŠN
  { wch: 10 },  // C - Lá»šP
  { wch: 12 },  // D - ÄIá»‚M Äáº¦U
  { wch: 15 },  // E - VI PHáº M/Láº¦N
  { wch: 10 },  // F - TRá»ª
  { wch: 12 },  // G - VIá»†C Tá»T
  { wch: 10 },  // H - Cá»˜NG
  { wch: 12 },  // I - ÄIá»‚M CUá»I
  { wch: 14 },  // J - Xáº¾P LOáº I
  { wch: 25 },  // K - GHI CHÃš
  { wch: 8, hidden: true }, // L - S (cá»™t ká»¹ thuáº­t)
];

// =========================================================
// CHIá»€U CAO DÃ’NG
// =========================================================

worksheet["!rows"] = [];

worksheet["!rows"][0] = {
  hpt: 28,
};

worksheet["!rows"][1] = {
  hpt: 24,
};

worksheet["!rows"][2] = {
  hpt: 10,
};

worksheet["!rows"][3] = {
  hpt: 38,
};

for (
  let row = 4;
  row < sheetData.length + 4;
  row++
) {
  worksheet["!rows"][row] = {
    hpt: 24,
  };
}

// =========================================================
// Äá»ŠNH Dáº NG TOÃ€N Bá»˜ Báº¢NG
// =========================================================

const totalRows =
  sheetData.length + 4;

const totalCols = 12;

for (
  let row = 0;
  row < totalRows;
  row++
) {
  for (
    let col = 0;
    col < totalCols;
    col++
  ) {

    const address =
      XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

    const cell =
      worksheet[address];

    if (!cell) continue;

    cell.s = {
      font: {
        name: "Times New Roman",
        sz: 14,
      },

      alignment: {
        horizontal:
          col === 1
            ? "left"
            : "center",

        vertical: "center",

        wrapText: true,
      },

      border: {
        top: {
          style: "thin",
        },
        bottom: {
          style: "thin",
        },
        left: {
          style: "thin",
        },
        right: {
          style: "thin",
        },
      },
    };
  }
}

// =========================================================
// Äá»ŠNH Dáº NG TIÃŠU Äá»€ Báº¢NG - DÃ’NG 4
// =========================================================

for (
  let col = 0;
  col < totalCols;
  col++
) {

  const address =
    XLSX.utils.encode_cell({
      r: 3,
      c: col,
    });

  const cell =
    worksheet[address];

  if (!cell) continue;

  cell.s = {
    font: {
      name: "Times New Roman",
      sz: 14,
      bold: true,
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },

    border: {
      top: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
      left: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
    },
  };
}

// =========================================================
// TIÃŠU Äá»€ Lá»šN A1
// =========================================================

if (worksheet["A1"]) {
  worksheet["A1"].s = {
    font: {
      name: "Times New Roman",
      sz: 14,
      bold: true,
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };
}

// =========================================================
// THÃ”NG TIN Lá»šP - A2
// =========================================================

if (worksheet["A2"]) {
  worksheet["A2"].s = {
    font: {
      name: "Times New Roman",
      sz: 14,
      bold: true,
    },

    alignment: {
      horizontal: "left",
      vertical: "center",
    },
  };
}

// =========================================================
// KHá»I - F2
// =========================================================

if (worksheet["F2"]) {
  worksheet["F2"].s = {
    font: {
      name: "Times New Roman",
      sz: 14,
      bold: true,
    },

    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };
}

// =========================================================
// MÃ€U Xáº¾P LOáº I + ÄÃNH Dáº¤U CÃ“ VI PHáº M KHI XUáº¤T EXCEL
// =========================================================
//
// Quy táº¯c:
// - Tá»‘t + khÃ´ng bá»‹ trá»«: khÃ´ng tÃ´ mÃ u.
// - Tá»‘t + cÃ³ bá»‹ trá»«: má»™t mÃ u highlight duy nháº¥t.
// - KhÃ¡ / Äáº¡t / ChÆ°a Ä‘áº¡t: má»—i má»©c má»™t mÃ u riÃªng.
// =========================================================

for (
  let dataIndex = 0;
  dataIndex < sheetData.length;
  dataIndex++
) {
  const excelRow = dataIndex + 5;

  const deduction = Number(
    sheetData[dataIndex]["TRá»ª"] ?? 0
  );

  const bonus = Number(
    sheetData[dataIndex]["Cá»˜NG"] ?? 0
  );

  // Äiá»ƒm cuá»‘i thá»±c táº¿ = ÄIá»‚M Äáº¦U - TRá»ª + Cá»˜NG
  const finalScore =
    100 - deduction + bonus;

  // CÃ³ Ã­t nháº¥t 1 lá»—i nhÃ³m S thÃ¬ háº¡ 1 báº­c
  const hasSeriousViolation =
    hasSeriousViolationGroup(
      mergedData[dataIndex]?.conduct?.groupViolations
    );

  // Xáº¿p loáº¡i pháº£i giá»‘ng Ä‘Ãºng quy táº¯c trÃªn web
  const classification =
    getFinalWeeklyClassification(
      finalScore,
      hasSeriousViolation
    );

  const fillColor =
    getExcelConductFillColor(
      classification,
      deduction
    );

  if (!fillColor) continue;

  for (
    let col = 0;
    col < totalCols;
    col++
  ) {
    const address =
      XLSX.utils.encode_cell({
        r: excelRow - 1,
        c: col,
      });

    const cell =
      worksheet[address];

    if (!cell) continue;

    cell.s = {
      ...(cell.s || {}),
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: fillColor,
        },
      },
    };
  }
}

// =========================================================
// THÃŠM SHEET
// =========================================================

XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  className
);
    }
    // -----------------------------------------
    // Táº¢I FILE
    // -----------------------------------------

    const fileName =
      `DiemRenLuyen_Khoi${exportGrade}_Tuan${weekNumber}.xlsx`;

    XLSX.writeFile(
      workbook,
      fileName
    );

    setSnackbar({
      open: true,
      message:
        `ÄÃ£ xuáº¥t Excel khá»‘i ${exportGrade}, tuáº§n ${weekNumber}`,
      severity: "success",
    });

    setExportDialogOpen(false);

  } catch (error) {
    console.error(
      "âŒ Lá»–I XUáº¤T EXCEL:",
      error
    );

    setSnackbar({
      open: true,
      message:
        "KhÃ´ng thá»ƒ xuáº¥t file Excel.",
      severity: "error",
    });
  } finally {
    setLoadingData(false);
  }
};
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
          "Lá»—i táº£i Ä‘iá»ƒm háº¡nh kiá»ƒm tuáº§n:",
          error
        );

        setWeeklyData([]);

        setSnackbar({
          open: true,
          message:
            "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u háº¡nh kiá»ƒm tuáº§n",
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
// FINALIZE TOÃ€N TRÆ¯á»œNG THEO TUáº¦N
// =========================================================

const handleFinalizeWeek = async () => {
  if (selectedWeek === "") {
    setSnackbar({
      open: true,
      message: "Vui lÃ²ng chá»n tuáº§n trÆ°á»›c khi duyá»‡t",
      severity: "warning",
    });

    return;
  }

  const confirmed = window.confirm(
    `Báº¡n cÃ³ cháº¯c muá»‘n duyá»‡t Ä‘iá»ƒm rÃ¨n luyá»‡n TOÃ€N TRÆ¯á»œNG cá»§a tuáº§n ${selectedWeek} khÃ´ng?`
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
      "âœ… Káº¾T QUáº¢ DUYá»†T TOÃ€N TRÆ¯á»œNG:",
      res.data
    );

    setSnackbar({
      open: true,
      message:
        res.data?.message ||
        `ÄÃ£ duyá»‡t rÃ¨n luyá»‡n toÃ n trÆ°á»ng tuáº§n ${selectedWeek}`,
      severity: "success",
    });

    // Táº£i láº¡i dá»¯ liá»‡u lá»›p Ä‘ang xem
    await loadWeeklyData();

  } catch (error: any) {
    console.error(
      "âŒ Lá»—i duyá»‡t rÃ¨n luyá»‡n toÃ n trÆ°á»ng:",
      error
    );
     const status = error?.response?.status;

  if (status === 401 || status === 403) {
    setSnackbar({
      open: true,
      message:
        "Báº¡n khÃ´ng pháº£i QTV, khÃ´ng cÃ³ quyá»n duyá»‡t.",
      severity: "warning",
    });

    return;
  }
    setSnackbar({
      open: true,
      message:
        error?.response?.data?.message ||
        "KhÃ´ng thá»ƒ duyá»‡t rÃ¨n luyá»‡n toÃ n trÆ°á»ng",
      severity: "error",
    });
  } finally {
    setLoadingData(false);
  }
};
  // =========================================================
// Láº¤Y Dá»® LIá»†U Háº NH KIá»‚M TUáº¦N CHO 1 Lá»šP - DÃ™NG KHI XUáº¤T EXCEL
// =========================================================

const loadWeeklyDataForExport = async (
  className: string,
  weekNumber: number
) => {
  try {
    const res = await api.get(
      "/api/student-conduct-scores",
      {
        params: {
          className,
          academicYear: CURRENT_ACADEMIC_YEAR,
          weekNumber,
        },
      }
    );

    return Array.isArray(res.data)
      ? res.data
      : [];
  } catch (error) {
    console.error(
      `âŒ Lá»—i táº£i dá»¯ liá»‡u lá»›p ${className}, tuáº§n ${weekNumber}:`,
      error
    );

    return [];
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
        // 1. API THÃNG
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
        // 2. XÃC Äá»ŠNH CÃC TUáº¦N TRONG THÃNG
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
        // Náº¿u study-week khÃ´ng cÃ³ start/end thÃ¬
        // láº¥y weekNumbers tá»« dá»¯ liá»‡u thÃ¡ng.
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
        // 3. Gá»ŒI API TUáº¦N CHO Tá»ªNG TUáº¦N
        //
        // Má»¥c Ä‘Ã­ch:
        // Tuáº§n 1 -> Äiá»ƒm + Xáº¿p loáº¡i
        // Tuáº§n 2 -> Äiá»ƒm + Xáº¿p loáº¡i
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
                    `Lá»—i táº£i rÃ¨n luyá»‡n tuáº§n ${week.weekNumber}:`,
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
          "Lá»—i táº£i dá»¯ liá»‡u rÃ¨n luyá»‡n thÃ¡ng:",
          error
        );

        setMonthlyData([]);
        setMonthlyWeeklyData([]);

        setSnackbar({
          open: true,
          message:
            "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u rÃ¨n luyá»‡n thÃ¡ng",
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
          "Lá»—i táº£i háº¡nh kiá»ƒm nÄƒm:",
          error
        );

        setAnnualData([]);

        setSnackbar({
          open: true,
          message:
            "KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u háº¡nh kiá»ƒm nÄƒm",
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
            "Vui lÃ²ng chá»n lá»›p",
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
            "Vui lÃ²ng chá»n tuáº§n",
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
            "Vui lÃ²ng chá»n thÃ¡ng há»c",
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
    // Äá»•i cháº¿ Ä‘á»™ xem -> luÃ´n trá»Ÿ vá» tráº¡ng thÃ¡i trá»‘ng
    setViewMode(mode);

    // XÃ“A TOÃ€N Bá»˜ Dá»® LIá»†U ÄANG HIá»‚N THá»Š
    setHasLoadedData(false);

    setStudents([]);

    setWeeklyData([]);
    setMonthlyData([]);
    setMonthlyWeeklyData([]);
    setAnnualData([]);

    // KhÃ´ng tá»± Ä‘á»™ng táº£i láº¡i dá»¯ liá»‡u
    // Pháº£i báº¥m "XEM Dá»® LIá»†U"
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
          ChÃº thÃ­ch nhÃ³m vi pháº¡m
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
            ChuyÃªn cáº§n, Ä‘á»“ng phá»¥c,
            tÃ¡c phong
          </Typography>

          <Typography variant="body2">
            <strong>N2:</strong>{" "}
            Vá»‡ sinh, trá»±c nháº­t,
            xáº¿p hÃ ng, chÃ o cá»,
            sinh hoáº¡t táº­p thá»ƒ
          </Typography>

          <Typography variant="body2">
            <strong>N3:</strong>{" "}
            Thiáº¿t bá»‹, Ä‘iá»‡n thoáº¡i,
            tráº­t tá»± há»c táº­p
          </Typography>

          <Typography variant="body2">
            <strong>N4:</strong>{" "}
            Báº£o quáº£n cÆ¡ sá»Ÿ váº­t cháº¥t
          </Typography>

          <Typography variant="body2">
            <strong>N5:</strong>{" "}
            CÃ¡c vi pháº¡m ná»™i quy khÃ¡c
          </Typography>

          <Typography variant="body2">
            <strong>S1:</strong>{" "}
            Äáº·c biá»‡t nghiÃªm trá»ng
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.7,
          }}
        >
          Má»—i vi pháº¡m N1-N5 bá»‹
          trá»« 1 Ä‘iá»ƒm. S1 khÃ´ng
          trá»« Ä‘iá»ƒm nhÆ°ng Ä‘Æ°á»£c
          ghi nháº­n lÃ  vi pháº¡m
          nghiÃªm trá»ng.
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
            Tá»•ng báº£n ghi
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
            HS cÃ³ vi pháº¡m
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
            HS khÃ´ng vi pháº¡m
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
            HS cÃ³ S1
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
                  "Há» vÃ  tÃªn",
                  "Tuáº§n",
                  "N1",
                  "N2",
                  "N3",
                  "N4",
                  "N5",
                  "S1",
                  "Tá»•ng lá»—i",
                  "Äiá»ƒm",
                  "Xáº¿p loáº¡i",
                  "Tráº¡ng thÃ¡i",
                ].map(
                  (
                    title: string
                  ) => (
                    <TableCell
                      key={title}
                      align={
                        title ===
                          "Há» vÃ  tÃªn"
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
                  
                  // CÃ³ Ã­t nháº¥t 1 lá»—i nghiÃªm trá»ng nhÃ³m S1
                  const hasSeriousViolation =
                    Number(
                      record?.groupViolations?.S1 ?? 0
                    ) > 0;
                  
                  const classification =
                    getFinalWeeklyClassification(
                      score,
                      hasSeriousViolation
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
      classification,
      Number(
        record?.totalDeduction ??
          totalViolation
      )
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
                  HEADER DÃ’NG 1
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
                  Há» vÃ  tÃªn
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
                      Tuáº§n{" "}
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
                  Xáº¿p loáº¡i tá»•ng
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
                  Tráº¡ng thÃ¡i
                </TableCell>
              </TableRow>

              {/* ---------------------------------------
                  HEADER DÃ’NG 2
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
                    <Fragment 
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
                        Äiá»ƒm
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          fontWeight:
                            "bold",
                        }}
                      >
                        Xáº¿p loáº¡i
                      </TableCell>
                    </Fragment>
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
                          
                          const hasSeriousViolation =
                            Number(
                              record?.groupViolations?.S1 ?? 0
                            ) > 0;
                          
                          const classification =
                            score !== undefined
                              ? getFinalWeeklyClassification(
                                  score,
                                  hasSeriousViolation
                                )
                              : undefined;

                          return (
                            <Fragment
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
                            </Fragment>
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
                  Há» vÃ  tÃªn
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
                  Cáº£ nÄƒm
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight:
                      "bold",
                    minWidth: 90,
                  }}
                >
                  Tráº¡ng thÃ¡i
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
        Xáº¾P LOáº I Háº NH KIá»‚M Há»ŒC SINH
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
            XEM TUáº¦N
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
            XEM THÃNG
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
            XEM NÄ‚M
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
                label="Chá»n lá»›p"
                value={
                  selectedClass
                }
                onChange={(e) =>{
                    const newClass = e.target.value;
                  
                    setSelectedClass(newClass);
                  
                    // Reset dá»¯ liá»‡u Ä‘ang hiá»ƒn thá»‹
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
                    Äang táº£i...
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
                label="Tuáº§n"
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
                    Äang táº£i...
                  </MenuItem>
                ) : studyWeeks.length ===
                  0 ? (
                  <MenuItem disabled>
                    KhÃ´ng cÃ³ tuáº§n há»c
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
                        Tuáº§n{" "}
                        {
                          week.weekNumber
                        }
                      </MenuItem>
                    )
                  )
                )}
              </TextField>
              <Box
  sx={{
    display: "flex",
    gap: 1,
    alignItems: "center",
    flexWrap: "wrap",
  }}
>
  <Button
    variant="contained"
    onClick={handleView}
    sx={{
      height: 40,
      minWidth: 145,
      fontWeight: "bold",
    }}
  >
    XEM Dá»® LIá»†U
  </Button>

  <Button
    variant="contained"
    color="success"
    onClick={handleFinalizeWeek}
    disabled={
      selectedWeek === "" ||
      loadingData
    }
    sx={{
      height: 40,
      minWidth: 145,
      fontWeight: "bold",
    }}
  >
    DUYá»†T TUáº¦N
  </Button>
  <Button
  variant="contained"
  color="primary"
  startIcon={<FileDownload />}
  onClick={openExportDialog}
  sx={{
    height: 40,
    minWidth: 145,
    fontWeight: "bold",
  }}
>
  XUáº¤T EXCEL
</Button>              
  
</Box>
            </>
          )}

          {/* ---------------------------------------------
              MONTH
          --------------------------------------------- */}

          {viewMode === "month" && (
            <>
              <TextField
                select
                label="Chá»n lá»›p"
                value={
                  selectedClass
                }
                onChange={(e) => {
  const newClass = e.target.value;

  setSelectedClass(newClass);

  // Äá»•i lá»›p -> xÃ³a dá»¯ liá»‡u cÅ©
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
                    Äang táº£i...
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
                label="ThÃ¡ng há»c"
                value={
                  selectedMonthKey
                }
onChange={(e) => {
  const newMonth = e.target.value;

  setSelectedMonthKey(newMonth);

  // Äá»•i thÃ¡ng -> xÃ³a dá»¯ liá»‡u cÅ©
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
                XEM Dá»® LIá»†U
              </Button>
            </>
          )}

          {/* ---------------------------------------------
              YEAR
          --------------------------------------------- */}

          {viewMode === "year" && (
            <>
              <TextField
                label="NÄƒm há»c"
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
                label="Chá»n lá»›p"
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
                    Äang táº£i...
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
                XEM Dá»® LIá»†U
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* ===================================================
          WEEK LEGEND
          LUÃ”N HIá»‚N THá»Š SAU CBB
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
            Lá»›p{" "}
            {selectedClass}
          </Typography>

          <Typography
            color="text.secondary"
          >
            Tá»•ng sá»‘ há»c sinh:{" "}
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
            Cháº¿ Ä‘á»™:{" "}
            <strong>
              {viewMode ===
                "week" &&
                "Theo tuáº§n"}

              {viewMode ===
                "month" &&
                "Theo thÃ¡ng"}

              {viewMode ===
                "year" &&
                "Theo nÄƒm"}
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
                Tuáº§n:{" "}
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
                ThÃ¡ng há»c:{" "}
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
                NÄƒm há»c:{" "}
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
    NO STUDENTS / CHÆ¯A XEM Dá»® LIá»†U
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
        Báº¥m vÃ o nÃºt "XEM Dá»® LIá»†U" Ä‘á»ƒ xem.
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
        KhÃ´ng cÃ³ há»c sinh trong lá»›p nÃ y.
      </Typography>
    </Paper>
  )}
  <Dialog
  open={exportDialogOpen}
  onClose={() => setExportDialogOpen(false)}
  fullWidth
  maxWidth="xs"
>
  <DialogTitle>
    ðŸ“Š Xuáº¥t bÃ¡o cÃ¡o háº¡nh kiá»ƒm
  </DialogTitle>

  <DialogContent>
    <Stack spacing={2} sx={{ mt: 1 }}>

      <TextField
        select
        label="Khá»‘i"
        value={exportGrade}
        onChange={(e) =>
          setExportGrade(e.target.value)
        }
        fullWidth
      >
        <MenuItem value="">
          Chá»n khá»‘i
        </MenuItem>

        <MenuItem value="6">
          Khá»‘i 6
        </MenuItem>

        <MenuItem value="7">
          Khá»‘i 7
        </MenuItem>

        <MenuItem value="8">
          Khá»‘i 8
        </MenuItem>

        <MenuItem value="9">
          Khá»‘i 9
        </MenuItem>
      </TextField>

      <TextField
        select
        label="Tuáº§n"
        value={exportWeek}
        onChange={(e) =>
          setExportWeek(
            e.target.value === ""
              ? ""
              : Number(e.target.value)
          )
        }
        fullWidth
      >
        <MenuItem value="">
          Chá»n tuáº§n
        </MenuItem>

        {studyWeeks.map(
          (week: StudyWeek) => (
            <MenuItem
              key={week.weekNumber}
              value={week.weekNumber}
            >
              Tuáº§n {week.weekNumber}
            </MenuItem>
          )
        )}
      </TextField>

    </Stack>
  </DialogContent>

  <DialogActions>
    <Button
      onClick={() =>
        setExportDialogOpen(false)
      }
    >
      Há»¦Y
    </Button>
    <Button
  variant="contained"
  startIcon={<FileDownload />}
  disabled={
    exportGrade === "" ||
    exportWeek === ""
  }
onClick={exportConductExcel}
>
  XUáº¤T EXCEL
</Button>

  </DialogActions>
</Dialog>
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
