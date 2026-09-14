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
const rankedClasses = [...gradeClasses];

rankedClasses.sort(
  (a: any, b: any) =>
    b.total - a.total ||
    a.className.localeCompare(
      b.className,
      undefined,
      { numeric: true }
    )
);

let currentRank = 1;

rankedClasses.forEach(
  (item: any, index: number) => {
    if (
      index > 0 &&
      item.total ===
        rankedClasses[index - 1].total
    ) {
      item.rank =
        rankedClasses[index - 1].rank;
    } else {
      item.rank = currentRank;
    }

    currentRank++;
  }
);

// Lấy hạng theo tên lớp
const rankMap = new Map<string, number>();

rankedClasses.forEach((item: any) => {
  rankMap.set(item.className, item.rank);
});

// GIỮ NGUYÊN THỨ TỰ LỚP BAN ĐẦU
gradeClasses.forEach((item: any) => {
  item.rank =
    rankMap.get(item.className) ?? 0;
});

exportRows.push(...gradeClasses);
    });

    // =========================================================
    // 7. TẠO HEADER
    // =========================================================
    const data: (
      | string
      | number
      | null
    )[][] = [
      ["Liên đội THCS Lê Lai"],
      [],
      [
        `BẢNG ĐIỂM THI ĐUA TUẦN ${selectedWeek} - NĂM HỌC: ${selectedAcademicYear}`,
      ],
      [],
      [
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
      ],
      [
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
      ],
    ];

    // =========================================================
    // 8. THÊM CÁC DÒNG DỮ LIỆU
    // =========================================================
    exportRows.forEach(
      (row: any, index: number) => {
        data.push([
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
      }
    );

    const worksheet =
      XLSX.utils.aoa_to_sheet(data);

    // =========================================================
    // 9. MERGE HEADER
    // =========================================================
    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 11 },
      },
      {
        s: { r: 2, c: 0 },
        e: { r: 2, c: 11 },
      },
      {
        s: { r: 4, c: 4 },
        e: { r: 4, c: 7 },
      },
      {
        s: { r: 4, c: 0 },
        e: { r: 5, c: 0 },
      },
      {
        s: { r: 4, c: 1 },
        e: { r: 5, c: 1 },
      },
      {
        s: { r: 4, c: 2 },
        e: { r: 5, c: 2 },
      },
      {
        s: { r: 4, c: 3 },
        e: { r: 5, c: 3 },
      },
      {
        s: { r: 4, c: 8 },
        e: { r: 5, c: 8 },
      },
      {
        s: { r: 4, c: 9 },
        e: { r: 5, c: 9 },
      },
      {
        s: { r: 4, c: 10 },
        e: { r: 5, c: 10 },
      },
      {
        s: { r: 4, c: 11 },
        e: { r: 5, c: 11 },
      },
    ];

    // =========================================================
    // 10. STYLE CƠ BẢN
    // =========================================================

    
    
    // =========================================================
    // 11. MÀU NỀN THEO KHỐI
    // =========================================================
    // Chỉ dùng 2 màu:
    // Khối 6: xanh nhạt
    // Khối 7: trắng
    // Khối 8: xanh nhạt
    // Khối 9: trắng
    //
    // Mục tiêu: nhìn vào là nhận ra ngay từng khối,
    // nhưng bảng vẫn sạch và dễ đọc.
    // =========================================================

    const gradeFill: Record<string, string> = {
      "6": "FFF2CC", // vàng nhạt
      "7": "DDEBF7", // xanh dương nhạt
      "8": "E2F0D9", // xanh lá nhạt
      "9": "FCE4EC", // hồng nhạt
    };

    // =========================================================
    // 13. STYLE TIÊU ĐỀ
    // =========================================================

    worksheet["A1"].s = {
      font: {
        name: "Times New Roman",
        sz: 16,
        bold: true,
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
      },
    };

    worksheet["A3"].s = {
      font: {
        name: "Times New Roman",
        sz: 16,
        bold: true,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    // =========================================================
    // 14. STYLE HEADER 2 TẦNG
    // =========================================================

    for (let r = 4; r <= 5; r++) {
      for (let c = 0; c < 12; c++) {
        const cell = XLSX.utils.encode_cell({
          r,
          c,
        });

        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: {
              name: "Times New Roman",
              sz: 12,
              bold: true,
            },

            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            },

            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },

            fill: {
              patternType: "solid",
              fgColor: {
                rgb: "D9E2F3",
              },
            },
          };
        }
      }
    }

    // =========================================================
    // 15. CÔNG THỨC + ĐỊNH DẠNG TỪNG DÒNG
    // =========================================================

    const firstDataRow = 7;

    const lastDataRow =
      firstDataRow +
      exportRows.length -
      1;

    exportRows.forEach(
      (row: any, index: number) => {
        const excelRow =
          firstDataRow + index;

        // -----------------------------------------------------
        // I = Tổng nề nếp
        // -----------------------------------------------------
        worksheet[`I${excelRow}`] = {
          t: "n",
          f:
            `MAX(0,100-(E${excelRow}` +
            `+F${excelRow}` +
            `+G${excelRow}` +
            `+H${excelRow}))`,
        };

        // -----------------------------------------------------
        // J = Tổng thi đua
        // -----------------------------------------------------
        worksheet[`J${excelRow}`] = {
          t: "n",
          f:
            `I${excelRow}` +
            `+C${excelRow}` +
            `+D${excelRow}`,
        };
        
        // -----------------------------------------------------
        // K = Xếp loại
        // Nề nếp < 50 VÀ Tổng < 60 → KHÔNG ĐẠT
        // -----------------------------------------------------
        worksheet[`K${excelRow}`] = {
          t: "s",
          f:
            `IF(AND(I${excelRow}<50,J${excelRow}<60),` +
            `"KHÔNG ĐẠT",` +
            `IF(AND(J${excelRow}>=110,I${excelRow}>=80),` +
            `"TỐT",` +
            `IF(AND(J${excelRow}>=90,I${excelRow}>=60),` +
            `"KHÁ",` +
            `IF(AND(J${excelRow}>=60,I${excelRow}>=50),` +
            `"ĐẠT","KHÔNG ĐẠT"))))`,
        };

        // -----------------------------------------------------
        // L = Xếp hạng riêng theo khối
        // -----------------------------------------------------
        worksheet[`L${excelRow}`] = {
          t: "n",
          f:
            `IF(K${excelRow}="","",` +
            `IF(K${excelRow}="TỐT",` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"TỐT",` +
            `$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow}` +
            `)+1,` +
            `IF(K${excelRow}="KHÁ",` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"TỐT"` +
            `)+` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"KHÁ",` +
            `$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow}` +
            `)+1,` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"TỐT"` +
            `)+` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"KHÁ"` +
            `)+` +
            `COUNTIFS(` +
            `$B$${firstDataRow}:$B$${lastDataRow},` +
            `LEFT(B${excelRow},1)&"*",` +
            `$K$${firstDataRow}:$K$${lastDataRow},"ĐẠT",` +
            `$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow}` +
            `)+1)))`,
        };

        // =====================================================
        // STYLE DÒNG THEO KHỐI
        // Chưa áp dụng màu theo hạng
        // =====================================================
        
        const background =
          gradeFill[row.grade] ?? "FFFFFF";
        
        // Đường viền đậm ở dòng đầu của mỗi khối
        const previousRow =
          index > 0 ? exportRows[index - 1] : null;
        
        const isGradeStart =
          !previousRow ||
          previousRow.grade !== row.grade;
        
        for (let c = 0; c < 12; c++) {
          const cell =
            XLSX.utils.encode_cell({
              r: excelRow - 1,
              c,
            });

          if (!worksheet[cell]) {
            worksheet[cell] = {
              t: "s",
              v: "",
            };
          }

          worksheet[cell].s = {
            font: {
              name: "Times New Roman",
              sz: 12,
              bold: false,
            },
            alignment: {
              horizontal: "center",
              vertical: "center",
            },
            fill: {
              patternType: "solid",
              fgColor: {
                rgb: background,
              },
            },
            border: {
              top: {
                style: isGradeStart ? "medium" : "thin",
              },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          };
        }

        // =====================================================
        // Định dạng số
        // =====================================================

       

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
        ].forEach((col) => {
          if (worksheet[`${col}${excelRow}`]) {
            worksheet[`${col}${excelRow}`].z =
              "0.0";
          }
        });
      }
    );
   
    // =========================================================
    // 16. ĐỘ RỘNG CỘT
    // =========================================================
    worksheet["!cols"] = [
      { wch: 7 },   // STT
      { wch: 10 },  // Lớp
      { wch: 12 },  // Học tập
      { wch: 14 },  // Khen thưởng
      { wch: 11 },  // Vi phạm
      { wch: 12 },  // Xếp hàng
      { wch: 14 },  // Chuyên cần
      { wch: 11 },  // Vệ sinh
      { wch: 14 },  // Tổng nề nếp
      { wch: 12 },  // Tổng
      { wch: 12 },  // Xếp loại
      { wch: 12 },  // Xếp hạng
    ];

    // =========================================================
    // 17. CHIỀU CAO DÒNG
    // =========================================================
    worksheet["!rows"] = [
      { hpt: 25 },
      { hpt: 10 },
      { hpt: 30 },
      { hpt: 10 },
      { hpt: 32 },
      { hpt: 30 },
    ];

    // =========================================================
    // 18. CẤU HÌNH IN
    // =========================================================
    worksheet["!pageSetup"] = {
      orientation: "landscape",
      fitToWidth: 1,
      fitToHeight: 0,
    };

    worksheet["!printOptions"] = {
      horizontalCentered: true,
      verticalCentered: false,
    };

    // =========================================================
    // 19. TẠO FILE
    // =========================================================
    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Thi đua tuần ${selectedWeek}`
    );

    XLSX.writeFile(
      workbook,
      `Tong_Hop_Thi_Dua_Tuan_${selectedWeek}_${selectedAcademicYear}.xlsx`
    );
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
