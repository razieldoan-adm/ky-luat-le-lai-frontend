import React, { useEffect, useState } from "react";
import {
  Box, Typography, CircularProgress, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import api from "../../api/api";
import ExcelJS from "exceljs";

interface ClassWeeklyScore {
  _id?: string;
  className: string;
  grade: string;
  academicYear: string;
  weekNumber: number;
  hygieneScore: number;
  lineUpScore: number;       // ✅ đổi chữ “U” → thường
  violationScore: number;
  attendanceScore: number;
  academicScore: number;
  bonusScore: number;         // ✅ đổi rewardScore → bonusScore
  totalViolation?: number;    // ✅ thêm nếu backend có
  totalScore?: number;
  rank?: number;
}
interface AcademicWeek {
  _id: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  weekNumber: number | null;
  isStudyWeek: boolean;
}
const WeeklyScoresPage: React.FC = () => {

  // =========================================================
  // XÁC ĐỊNH NĂM HỌC HIỆN TẠI
  // =========================================================
  const getCurrentAcademicYear = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    // Tháng 1 -> tháng 5:
    // thuộc năm học bắt đầu từ năm trước
    if (month >= 1 && month <= 5) {
      return `${year - 1}-${year}`;
    }

    // Tháng 6 -> tháng 12:
    // thuộc năm học mới
    return `${year}-${year + 1}`;
  };
  
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("");

  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);
  
  const [scores, setScores] = useState<ClassWeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ maxDiscipline: number }>({ maxDiscipline: 100 });
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingRank, setLoadingRank] = useState(false);

  // --- Load danh sách tuần & tuần hiện tại
useEffect(() => {
  const fetchAcademicYears = async () => {
    try {
      const currentYear =
        getCurrentAcademicYear();

      const res = await api.get(
        "/api/class-weekly-scores/academic-years"
      );

      const savedYears: string[] =
        Array.isArray(res.data)
          ? res.data
          : [];

      // Chỉ giữ các năm học không lớn hơn năm hiện tại
      const validPastYears =
        savedYears.filter(
          (year) =>
            year <= currentYear
        );

      // Năm hiện tại luôn phải xuất hiện
      const years = Array.from(
        new Set([
          currentYear,
          ...validPastYears,
        ])
      ).sort((a, b) =>
        b.localeCompare(a)
      );

      setAcademicYears(years);

      // Mặc định luôn là năm học hiện tại
      setSelectedAcademicYear(
        currentYear
      );
    } catch (err) {
      console.error(
        "❌ Lỗi khi tải năm học:",
        err
      );

      const currentYear =
        getCurrentAcademicYear();

      setAcademicYears([
        currentYear,
      ]);

      setSelectedAcademicYear(
        currentYear
      );
    }
  };

  fetchAcademicYears();
}, []);

  useEffect(() => {
  if (!selectedAcademicYear) return;

  const fetchWeeks = async () => {
    try {
      const res = await api.get(
        "/api/class-weekly-scores/study-weeks",
        {
          params: {
            academicYear:
              selectedAcademicYear,
          },
        }
      );

      const list: AcademicWeek[] =
        Array.isArray(res.data)
          ? res.data
          : [];

      setWeeks(list);

      // =========================================
      // XÁC ĐỊNH TUẦN HIỆN TẠI
      // =========================================

      const today = new Date();

      let currentWeek: number | null =
        null;

      for (const week of list) {
        if (week.weekNumber == null) {
          continue;
        }

        const start =
          new Date(week.startDate);

        const end =
          new Date(week.endDate);

        if (
          today >= start &&
          today <= end
        ) {
          currentWeek =
            week.weekNumber;

          break;
        }
      }

      setCurrentWeekNumber(
        currentWeek
      );

      // =========================================
      // NĂM HIỆN TẠI
      // → chọn tuần hiện tại
      //
      // NĂM CŨ
      // → chọn tuần đầu tiên có dữ liệu
      // =========================================

      if (
        selectedAcademicYear ===
        getCurrentAcademicYear()
      ) {
        if (currentWeek !== null) {
          setSelectedWeek(
            currentWeek
          );

          await loadScores(
            currentWeek
          );
        } else {
          setSelectedWeek("");
          setScores([]);
        }
      } else {
        const firstWeek =
          list.find(
            (w) =>
              w.weekNumber != null
          );

        if (firstWeek?.weekNumber) {
          setSelectedWeek(
            firstWeek.weekNumber
          );

          await loadScores(
            firstWeek.weekNumber
          );
        } else {
          setSelectedWeek("");
          setScores([]);
        }
      }
    } catch (err) {
      console.error(
        "❌ Lỗi khi tải tuần học:",
        err
      );

      setWeeks([]);
      setSelectedWeek("");
      setScores([]);
    }
  };

  fetchWeeks();
}, [selectedAcademicYear]);
  
  // --- Load cấu hình hệ thống
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings({ maxDiscipline: res.data?.maxDiscipline ?? 100 });
      } catch {
        setSettings({ maxDiscipline: 100 });
      }
    };
    loadSettings();
  }, []);

  // --- Load điểm tuần
  const loadScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/class-weekly-scores/weekly`, { 
        params: { 
          academicYear: selectedAcademicYear,
          weekNumber 
        } 
      });
      let data: ClassWeeklyScore[] = res.data || [];

      // Tính điểm kỷ luật và tổng thi đua
      data = data.map((item) => {
        const discipline =
          settings.maxDiscipline -
          ((item.attendanceScore ?? 0) +
            (item.violationScore ?? 0) +
            (item.hygieneScore ?? 0) +
            (item.lineUpScore ?? 0));
        const total = discipline + (item.bonusScore ?? 0) + (item.academicScore ?? 30);
        return { ...item, totalViolation: discipline, totalScore: total };
      });

      // --- Xếp hạng riêng theo khối, có đồng hạng ---
      const grades = ["6", "7", "8", "9"];
      grades.forEach((g) => {
        const filtered = data.filter((d) => d.grade === g);
        filtered.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

        let currentRank = 1;
        filtered.forEach((d, i) => {
          if (i > 0 && d.totalScore === filtered[i - 1].totalScore) {
            d.rank = filtered[i - 1].rank; // đồng hạng với lớp trước
          } else {
            d.rank = currentRank;
          }
          currentRank++;
        });
      });

      setScores(data);
      setHasChanges(false);
    } catch (err) {
      console.error("Lỗi khi tải điểm:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Khi đổi tuần

  const handleAcademicYearChange = (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const year = e.target.value;
    
      setSelectedAcademicYear(year);
      setSelectedWeek("");
      setScores([]);
      setHasChanges(false);
    };
  
  const handleWeekChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const w = Number(e.target.value);
  
    setSelectedWeek(w);
  
    if (selectedAcademicYear && w) {
      loadScores(w);
    }
  };

  // --- Lưu toàn bộ điểm
  const handleSave = async () => {
  try {
    if (!scores.length || !selectedWeek || !selectedAcademicYear) {
      alert("❌ Không có dữ liệu để lưu.");
      return;
    }

    const payload = {
      records: scores.map((s) => ({
        className: s.className,
        grade: s.grade,
        academicYear: selectedAcademicYear,
        weekNumber: s.weekNumber || selectedWeek,
        academicScore: s.academicScore ?? 30,
        bonusScore: s.bonusScore ?? 0, // ✅ đổi rewardScore → bonusScore
        hygieneScore: s.hygieneScore ?? 0,
        lineUpScore: s.lineUpScore ?? 0, // ✅ đổi lineUpScore → lineupScore
        attendanceScore: s.attendanceScore ?? 0,
        violationScore: s.violationScore ?? 0,
        totalViolation: s.totalViolation ?? 0, // ✅ thêm mới nếu có
        totalScore: s.totalScore ?? 0,
        rank: s.rank ?? 0,
      })),
    };

    // 🔹 Gọi API mới để lưu toàn bộ điểm tuần
    const res = await api.post("/api/class-weekly-scores/save-manual", payload);

    alert("✅ " + (res.data?.message || "Đã lưu toàn bộ điểm tuần!"));
    loadScores(Number(selectedWeek));
  } catch (err) {
    console.error("❌ Lỗi khi lưu:", err);
    alert("❌ Không thể lưu dữ liệu điểm tuần!");
  }
};

  // --- Khi sửa điểm học tập hoặc thưởng
  const handleChangeScore = (
    className: string,
    field: keyof ClassWeeklyScore,
    value: number
  ) => {
    setHasChanges(true);
    setScores((prev) =>
      prev.map((s) => {
        if (s.className !== className) return s;

        // cập nhật giá trị mới
        const updated = { ...s, [field]: value };

        // tính lại điểm kỷ luật và tổng thi đua
        const discipline =
          settings.maxDiscipline -
          ((updated.attendanceScore ?? 0) * 5 +
            (updated.violationScore ?? 0) +
            (updated.hygieneScore ?? 0) +
            (updated.lineUpScore ?? 0));

        const total = discipline + (updated.bonusScore ?? 0) + (updated.academicScore ?? 0);

        return {
          ...updated,
          totalViolation: discipline,
          totalScore: total,
        };
      })
    );
  };

  // --- Cập nhật lại thứ hạng (đồng hạng) ---
  const handleRecalculateRanks = () => {
    if (!scores.length) return;
    setLoadingRank(true);

    setTimeout(() => {
      const grades = ["6", "7", "8", "9"];
      const updated = [...scores];

      grades.forEach((g) => {
        const filtered = updated.filter((d) => d.grade === g);
        filtered.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

        let currentRank = 1;
        filtered.forEach((d, i) => {
          if (i > 0 && d.totalScore === filtered[i - 1].totalScore) {
            d.rank = filtered[i - 1].rank;
          } else {
            d.rank = currentRank;
          }
          currentRank++;
        });
      });

      setScores(updated);
      setHasChanges(true);
      setLoadingRank(false);
    }, 0);
  };

  // --- Xuất Excel tổng hợp 4 khối
  // Bấm 1 lần -> tạo và tải file ngay, không mở dialog.
 // --- Xuất Excel tổng hợp 4 khối ---
const handleExport = async () => {
  if (!selectedAcademicYear || !selectedWeek) {
    alert("❌ Chưa chọn năm học hoặc tuần để xuất Excel.");
    return;
  }

  try {
    // =========================================================
    // 1. LẤY DANH SÁCH LỚP CHÍNH THỨC CÓ GVCN
    // =========================================================
    const classRes = await api.get("/api/classes/with-teacher");

    const classList = Array.isArray(classRes.data)
      ? classRes.data
      : Array.isArray(classRes.data?.classes)
      ? classRes.data.classes
      : [];

    if (!classList.length) {
      alert("❌ Không lấy được danh sách lớp có GVCN.");
      return;
    }

    // =========================================================
    // 2. HÀM CHUẨN HÓA TÊN LỚP
    // =========================================================
    const normalizeClassName = (value: unknown) =>
      String(value ?? "").trim().toUpperCase();

    const getGrade = (item: any) => {
      const directGrade = String(item?.grade ?? "").trim();

      if (["6", "7", "8", "9"].includes(directGrade)) {
        return directGrade;
      }

      const className = normalizeClassName(
        item?.className ??
          item?.name ??
          item?.class?.className
      );

      return className.match(/^[6789]/)?.[0] ?? "";
    };

    // =========================================================
    // 3. MAP ĐIỂM THEO LỚP
    // =========================================================
    const scoreMap = new Map(
      scores.map((s) => [
        normalizeClassName(s.className),
        s,
      ])
    );

    // =========================================================
    // 4. GHÉP DANH SÁCH LỚP + ĐIỂM
    // =========================================================
    const mergedClasses = classList
      .map((c: any) => {
        const className = String(
          c?.className ??
            c?.name ??
            c?.class?.className ??
            ""
        ).trim();

        const grade = getGrade(c);

        const score = scoreMap.get(
          normalizeClassName(className)
        );

        return {
          className,
          grade,
          score,
        };
      })
      .filter(
        (c: any) =>
          ["6", "7", "8", "9"].includes(c.grade) &&
          c.className
      );

    if (!mergedClasses.length) {
      alert("❌ Không tìm thấy lớp khối 6-9 có GVCN.");
      return;
    }

    // =========================================================
    // 5. TẠO DỮ LIỆU XUẤT
    // =========================================================
    const grades = ["6", "7", "8", "9"];

    const exportRows: any[] = [];

    grades.forEach((grade) => {
      const gradeClasses = mergedClasses
        .filter((c: any) => c.grade === grade)
        .map((row: any) => {
          const score = row.score;

          const academic =
            score?.academicScore ?? 30;

          const bonus =
            score?.bonusScore ?? 0;

          const violation =
            score?.violationScore ?? 0;

          const lineUp =
            score?.lineUpScore ?? 0;

          // Trong Excel đang sử dụng chuyên cần * 5
          const attendance =
            (score?.attendanceScore ?? 0) * 5;

          const hygiene =
            score?.hygieneScore ?? 0;

          // Tính giống công thức Excel
          const discipline = Math.max(
            0,
            100 -
              (
                violation +
                lineUp +
                attendance +
                hygiene
              )
          );

          const total =
            discipline +
            academic +
            bonus;

          return {
            className: row.className,
            grade,
            academic,
            bonus,
            violation,
            lineUp,
            attendance,
            hygiene,
            discipline,
            total,
            rank: 0,
          };
        });

// =======================================================
// 6. XẾP HẠNG RIÊNG TỪNG KHỐI
//    - TÍNH HẠNG THEO ĐIỂM
//    - NHƯNG KHÔNG ĐỔI THỨ TỰ LỚP
// =======================================================

// Tạo bản sao để xếp hạng


exportRows.push(...gradeClasses);
  

      // =========================================================
    // 7. TẠO FILE EXCEL BẰNG EXCELJS
    // =========================================================

    const workbook = new ExcelJS.Workbook();
    
    workbook.calcProperties.fullCalcOnLoad = true;
    
    const worksheet = workbook.addWorksheet(
      `Thi đua tuần ${selectedWeek}`
    );

    // =========================================================
    // 8. TẠO HEADER
    // =========================================================

    worksheet.getCell("A1").value =
      "Liên đội THCS Lê Lai";

    worksheet.getCell("A3").value =
      `BẢNG ĐIỂM THI ĐUA TUẦN ${selectedWeek} - NĂM HỌC: ${selectedAcademicYear}`;

    worksheet.getRow(5).values = [
      "STT",
      "Lớp",
      "Học tập",
      "Khen thưởng",
      "Nề nếp",
      null,
      null,
      null,
      "Tổng\nnề nếp",
      "Tổng",
      "Xếp loại",
      "Xếp hạng",
    ];

    worksheet.getRow(6).values = [
      null,
      null,
      null,
      null,
      "Vi phạm",
      "Xếp hàng",
      "Chuyên cần",
      "Vệ sinh",
      null,
      null,
      null,
      null,
    ];

    // =========================================================
    // 9. MERGE HEADER
    // =========================================================

    worksheet.mergeCells("A1:L1");
    worksheet.mergeCells("A3:L3");

    worksheet.mergeCells("E5:H5");

    worksheet.mergeCells("A5:A6");
    worksheet.mergeCells("B5:B6");
    worksheet.mergeCells("C5:C6");
    worksheet.mergeCells("D5:D6");
    worksheet.mergeCells("I5:I6");
    worksheet.mergeCells("J5:J6");
    worksheet.mergeCells("K5:K6");
    worksheet.mergeCells("L5:L6");

    // =========================================================
    // 10. STYLE TIÊU ĐỀ
    // =========================================================

    worksheet.getCell("A1").font = {
      name: "Times New Roman",
      size: 16,
      bold: true,
    };

    worksheet.getCell("A1").alignment = {
      horizontal: "left",
      vertical: "middle",
    };

    worksheet.getCell("A3").font = {
      name: "Times New Roman",
      size: 16,
      bold: true,
    };

    worksheet.getCell("A3").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // =========================================================
    // 11. STYLE HEADER 2 TẦNG
    // =========================================================

    for (let rowNumber = 5; rowNumber <= 6; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      for (let columnNumber = 1; columnNumber <= 12; columnNumber++) {
        const cell = row.getCell(columnNumber);

        cell.font = {
          name: "Times New Roman",
          size: 12,
          bold: true,
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFD9E2F3",
          },
        };

        cell.border = {
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
        };
      }
    }

    // =========================================================
    // 12. DÒNG DỮ LIỆU
    // =========================================================

    const firstDataRow = 7;

    exportRows.forEach(
      (row: any, index: number) => {
        const excelRow = firstDataRow + index;

        const excelRowData = worksheet.addRow([
          index + 1,
          row.className,
          row.academic,
          row.bonus,
          row.violation,
          row.lineUp,
          row.attendance,
          row.hygiene,
          null,
          null,
          null,
          null,
        ]);

        // =====================================================
        // I = TỔNG NỀ NẾP
        // =====================================================

        worksheet.getCell(`I${excelRow}`).value = {
          formula:
            `MAX(0,100-(E${excelRow}+F${excelRow}+G${excelRow}+H${excelRow}))`,
        };

        // =====================================================
        // J = TỔNG THI ĐUA
        // =====================================================

        worksheet.getCell(`J${excelRow}`).value = {
          formula:
            `I${excelRow}+C${excelRow}+D${excelRow}`,
        };

        // =====================================================
        // K = XẾP LOẠI
        //
        // Nề nếp < 50 VÀ Tổng < 60
        // → KHÔNG ĐẠT
        // =====================================================

        worksheet.getCell(`K${excelRow}`).value = {
          formula:
            `IF(AND(I${excelRow}<50,J${excelRow}<60),"KHÔNG ĐẠT",` +
            `IF(AND(J${excelRow}>=110,I${excelRow}>=80),"TỐT",` +
            `IF(AND(J${excelRow}>=90,I${excelRow}>=60),"KHÁ",` +
            `IF(AND(J${excelRow}>=60,I${excelRow}>=50),"ĐẠT","KHÔNG ĐẠT"))))`,
        };

        // =====================================================
        // L = XẾP HẠNG
        // Xếp hạng bằng CÔNG THỨC EXCEL
        // =====================================================
        
        const gradeRows = exportRows
          .map((r: any, i: number) => ({
            grade: r.grade,
            excelRow: firstDataRow + i,
          }))
          .filter((r: any) => r.grade === row.grade);
        
        const gradeStartRow = gradeRows[0]?.excelRow;
        const gradeEndRow =
          gradeRows[gradeRows.length - 1]?.excelRow;
        
        if (gradeStartRow && gradeEndRow) {
          worksheet.getCell(`L${excelRow}`).value = {
            formula:
              `RANK.EQ(J${excelRow},` +
              `$J$${gradeStartRow}:$J$${gradeEndRow},0)`,
          };
        }
        
// =====================================================
// STYLE DÒNG
// =====================================================

const previousRow =
  index > 0
    ? exportRows[index - 1]
    : null;

const isGradeStart =
  !previousRow ||
  previousRow.grade !== row.grade;

// Màu nền mặc định theo khối
const gradeFillColors: Record<string, string> = {
  "6": "FFFFF2CC", // Vàng nhạt
  "7": "FFDDEBF7", // Xanh dương nhạt
  "8": "FFE2F0D9", // Xanh lá nhạt
  "9": "FFFCE4EC", // Hồng nhạt
};

const gradeColor =
  gradeFillColors[row.grade] ?? "FFFFFFFF";

for (
  let columnNumber = 1;
  columnNumber <= 12;
  columnNumber++
) {
  const cell =
    excelRowData.getCell(columnNumber);

  cell.font = {
    name: "Times New Roman",
    size: 12,
    bold: false,
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // ===================================================
  // TÔ MÀU TOÀN BỘ DÒNG THEO KHỐI
  // ===================================================
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: gradeColor,
    },
  };

          // ===================================================
          // VIỀN
          // Đầu mỗi khối dùng viền trên đậm
          // ===================================================
          cell.border = {
            top: {
              style: isGradeStart
                ? "medium"
                : "thin",
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
          };
        }
        
        // =====================================================
        // ĐỊNH DẠNG SỐ
        // =====================================================

        [
          "C",
          "D",
          "E",
          "F",
          "G",
          "H",
          "I",
          "J",
        ].forEach((column) => {
          worksheet.getCell(
            `${column}${excelRow}`
          ).numFmt = "0.0";
        });
      }
    );

    const lastDataRow =
      firstDataRow +
      exportRows.length -
      1;

    // =========================================================
    // 13. CONDITIONAL FORMATTING THEO KHỐI
    //
    // MÀU ĐỘNG - KHÔNG PHẢI MÀU TĨNH.
    //
    // Khối 6 → vàng nhạt
    // Khối 7 → xanh dương nhạt
    // Khối 8 → xanh lá nhạt
    // Khối 9 → hồng nhạt
    // =========================================================

    // =========================================================
// 13. CONDITIONAL FORMATTING
// =========================================================
// A:K → màu theo khối
// L   → màu theo xếp hạng
// =========================================================

// ---------------------------------------------------------
// 13.1. MÀU THEO KHỐI
// ---------------------------------------------------------

worksheet.addConditionalFormatting({
  ref: `A${firstDataRow}:K${lastDataRow}`,
  rules: [
    {
      type: "expression",
      priority: 1,
      formulae: [`LEFT($B${firstDataRow},1)="6"`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFFFF2CC",
          },
        },
      },
    },
    {
      type: "expression",
      priority: 2,
      formulae: [`LEFT($B${firstDataRow},1)="7"`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFDDEBF7",
          },
        },
      },
    },
    {
      type: "expression",
      priority: 3,
      formulae: [`LEFT($B${firstDataRow},1)="8"`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFE2F0D9",
          },
        },
      },
    },
    {
      type: "expression",
      priority: 4,
      formulae: [`LEFT($B${firstDataRow},1)="9"`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFFCE4EC",
          },
        },
      },
    },
  ],
});

// ---------------------------------------------------------
// 13.2. MÀU THEO XẾP HẠNG
// Chỉ áp dụng cho cột L
// ---------------------------------------------------------

worksheet.addConditionalFormatting({
  ref: `L${firstDataRow}:L${lastDataRow}`,
  rules: [
    {
      type: "expression",
      priority: 1,
      formulae: [`$L${firstDataRow}=1`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFFFD966",
          },
        },
        font: {
          bold: true,
        },
      },
    },
    {
      type: "expression",
      priority: 2,
      formulae: [`$L${firstDataRow}=2`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFD9E1F2",
          },
        },
        font: {
          bold: true,
        },
      },
    },
    {
      type: "expression",
      priority: 3,
      formulae: [`$L${firstDataRow}=3`],
      style: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF4B183",
          },
        },
        font: {
          bold: true,
        },
      },
    },
  ],
});
    // =========================================================
    // 14. ĐỘ RỘNG CỘT
    // =========================================================

    worksheet.columns = [
      { width: 7 },
      { width: 10 },
      { width: 12 },
      { width: 14 },
      { width: 11 },
      { width: 12 },
      { width: 14 },
      { width: 11 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];

    // =========================================================
    // 15. CHIỀU CAO DÒNG
    // =========================================================

    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 10;
    worksheet.getRow(3).height = 30;
    worksheet.getRow(4).height = 10;
    worksheet.getRow(5).height = 32;
    worksheet.getRow(6).height = 30;

    // =========================================================
    // 16. CẤU HÌNH IN
    // =========================================================

    worksheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    // =========================================================
    // 17. TẠO VÀ TẢI FILE
    // =========================================================

    const buffer =
      await workbook.xlsx.writeBuffer();

    const blob = new Blob(
      [buffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `Tong_Hop_Thi_Dua_Tuan_${selectedWeek}_${selectedAcademicYear}.xlsx`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    alert("✅ Đã xuất Excel thành công!");
  } catch (error) {
    console.error(
      "❌ Lỗi xuất Excel:",
      error
    );

    alert(
      "❌ Không thể xuất Excel. Vui lòng thử lại."
    );
  }
};

   
  // =========================================================
  // PHẦN SỐ 9 TRỞ XUỐNG: thêm tại đây
  // =========================================================

  
  // --- Hàm render bảng theo khối
  const renderTable = (grade: string) => {
    const list = scores.filter((s) => s.grade === grade);
    if (!list.length) return null;

    return (
      <Box key={grade} mt={4}>
        <Typography variant="h6" fontWeight="bold" mb={1}>
          📚 Khối {grade}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lớp</TableCell>
               
                <TableCell align="center">Xếp hàng</TableCell>
                <TableCell align="center">Vi phạm</TableCell>
                <TableCell align="center">Chuyên cần</TableCell>
                 <TableCell align="center">Vệ sinh</TableCell>
                <TableCell align="center">Học tập</TableCell>
                <TableCell align="center">Thưởng</TableCell>
                <TableCell align="center">Kỷ luật</TableCell>
                <TableCell align="center">Tổng thi đua</TableCell>
                <TableCell align="center">Xếp hạng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.className}>
                  <TableCell>{row.className}</TableCell>
                  <TableCell align="center">{row.lineUpScore}</TableCell>
                  <TableCell align="center">{row.violationScore}</TableCell>
                  <TableCell align="center">{row.attendanceScore}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.hygieneScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "hygieneScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.academicScore ?? 30}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "academicScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={row.bonusScore ?? 0}
                      size="small"
                      onChange={(e) =>
                        handleChangeScore(row.className, "bonusScore", Number(e.target.value))
                      }
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">{row.totalViolation?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.totalScore?.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.rank}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        🏫 Tổng hợp điểm thi đua theo khối
      </Typography>

      <Box
  display="flex"
  gap={2}
  mb={1}
  flexWrap="wrap"
>
  <TextField
    select
    label="Năm học"
    value={selectedAcademicYear}
    onChange={
      handleAcademicYearChange
    }
    sx={{
      width: 180,
    }}
  >
    {academicYears.map(
      (year) => (
        <MenuItem
          key={year}
          value={year}
        >
          {year}
        </MenuItem>
      )
    )}
  </TextField>

  <TextField
    select
    label="Tuần học"
    value={selectedWeek}
    onChange={
      handleWeekChange
    }
    sx={{
      width: 180,
    }}
  >
    {weeks
      .filter(
        (w) =>
          w.weekNumber != null
      )
      .map((week) => (
        <MenuItem
          key={week._id}
          value={
            week.weekNumber!
          }
        >
          Tuần{" "}
          {week.weekNumber}
        </MenuItem>
      ))}
  </TextField>

  <Button
    variant="contained"
    color="primary"
    onClick={handleSave}
  >
    💾 LƯU ĐIỂM
  </Button>

  <Button
    variant="outlined"
    color="secondary"
    onClick={
      handleRecalculateRanks
    }
    disabled={
      !hasChanges ||
      loadingRank
    }
  >
    {loadingRank
      ? "⏳ Đang xếp hạng..."
      : "📊 XẾP HẠNG"}
  </Button>

  <Button
    variant="outlined"
    color="success"
    onClick={handleExport}
  >
    📤 XUẤT EXCEL
  </Button>
</Box>
{selectedWeek && (
  <Typography
    variant="body2"
    color="text.secondary"
    mb={3}
  >
    {selectedAcademicYear ===
      getCurrentAcademicYear() &&
    currentWeekNumber ===
      selectedWeek
      ? `⭐ Tuần hiện tại: Tuần ${selectedWeek}`
      : `Đang xem Tuần ${selectedWeek} - Năm học ${selectedAcademicYear}`}
  </Typography>
)}
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {renderTable("6")}
          {renderTable("7")}
          {renderTable("8")}
          {renderTable("9")}
        </>
      )}
    </Box>
  );
};

export default WeeklyScoresPage;
