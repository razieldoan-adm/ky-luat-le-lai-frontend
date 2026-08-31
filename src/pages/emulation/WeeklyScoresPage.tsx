import React, { useEffect, useState } from "react";
import {
  Box, Typography, CircularProgress, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import api from "../../api/api";
import * as XLSX from "xlsx-js-style";

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
  
  const [weeks, setWeeks] = useState<number[]>([]);
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
        const total = discipline + (item.bonusScore ?? 0) + (item.academicScore ?? 0);
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
        academicScore: s.academicScore ?? 0,
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
  const handleExport = async () => {
    if (!selectedAcademicYear || !selectedWeek) {
      alert("❌ Chưa chọn năm học hoặc tuần để xuất Excel.");
      return;
    }

    try {
      // Lấy DANH SÁCH LỚP CHÍNH THỨC từ hệ thống trước.
      // Không dùng scores làm danh sách lớp vì scores chỉ là dữ liệu điểm
      // và có thể thiếu lớp chưa có bản ghi điểm tuần.
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

      const normalizeClassName = (value: unknown) =>
        String(value ?? "").trim().toUpperCase();

      const getGrade = (item: any) => {
        const directGrade = String(item?.grade ?? "").trim();
        if (["6", "7", "8", "9"].includes(directGrade)) return directGrade;

        const className = normalizeClassName(
          item?.className ?? item?.name ?? item?.class?.className
        );
        return className.match(/^[6789]/)?.[0] ?? "";
      };

      // Ghép danh sách lớp chính thức với điểm tuần.
      // Lớp chưa có dữ liệu tuần vẫn được xuất, các khoản điểm = 0.
      const scoreMap = new Map(
        scores.map((s) => [normalizeClassName(s.className), s])
      );

      const mergedClasses = classList
        .map((c: any) => {
          const className = String(
            c?.className ?? c?.name ?? c?.class?.className ?? ""
          ).trim();
          const grade = getGrade(c);
          const score = scoreMap.get(normalizeClassName(className));

          return {
            className,
            grade,
            score,
          };
        })
        .filter((c: any) => ["6", "7", "8", "9"].includes(c.grade) && c.className);

      if (!mergedClasses.length) {
        alert("❌ Không tìm thấy lớp khối 6-9 có GVCN.");
        return;
      }

      // Toàn bộ khối 6 -> 7 -> 8 -> 9 theo danh sách lớp chính thức.
      const allScores = ["6", "7", "8", "9"].flatMap((grade) =>
        mergedClasses
          .filter((c: any) => c.grade === grade)
          .sort((a: any, b: any) =>
            a.className.localeCompare(b.className, undefined, {
              numeric: true,
            })
          )
      );

    const rows = allScores.map((row: any, index: number) => {
      const score = row.score;

      return {
        stt: index + 1,
        className: row.className,
        grade: row.grade,
        academic: score?.academicScore ?? 0,
        bonus: score?.bonusScore ?? 0,
        violation: score?.violationScore ?? 0,
        lineUp: score?.lineUpScore ?? 0,
        attendance: (score?.attendanceScore ?? 0) * 5,
        hygiene: score?.hygieneScore ?? 0,
      };
    });

    // Header 2 tầng giống mẫu:
    // E:H = nhóm "Nề nếp".
    const data: (string | number | null)[][] = [
      ["Liên đội THCS Lê Lai"],
      [],
      [`BẢNG ĐIỂM THI ĐUA TUẦN ${selectedWeek} - NĂM HỌC: 2026-2027`],
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

    rows.forEach((row) => {
      data.push([
        row.stt,
        row.className,
        row.academic,
        row.bonus,
        row.violation,
        row.lineUp,
        row.attendance,
        row.hygiene,
        null, // I: công thức
        null, // J: công thức
        null, // K: công thức
        null, // L: công thức
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
      { s: { r: 4, c: 4 }, e: { r: 4, c: 7 } },
      { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
      { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
      { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } },
      { s: { r: 4, c: 8 }, e: { r: 5, c: 8 } },
      { s: { r: 4, c: 9 }, e: { r: 5, c: 9 } },
      { s: { r: 4, c: 10 }, e: { r: 5, c: 10 } },
      { s: { r: 4, c: 11 }, e: { r: 5, c: 11 } },
    ];

    const thinBorder = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };

    const titleStyle = {
      font: { name: "Times New Roman", sz: 16, bold: true },
      alignment: { horizontal: "left", vertical: "center" },
    };

    const mainTitleStyle = {
      font: { name: "Times New Roman", sz: 16, bold: true },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const headerStyle = {
      font: { name: "Times New Roman", sz: 12, bold: true },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: thinBorder,
    };

    const cellStyle = {
      font: { name: "Times New Roman", sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    };

    worksheet["A1"].s = titleStyle;
    worksheet["A3"].s = mainTitleStyle;

    // Header 2 tầng.
    for (let r = 4; r <= 5; r++) {
      for (let c = 0; c < 12; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (worksheet[cell]) worksheet[cell].s = headerStyle;
      }
    }

    const firstDataRow = 7; // Excel row 7
    const lastDataRow = firstDataRow + rows.length - 1;

    rows.forEach((_, index) => {
      const excelRow = firstDataRow + index;

      // I = 100 - (Vi phạm + Xếp hàng + Chuyên cần + Vệ sinh)
      worksheet[`I${excelRow}`] = {
        t: "n",
        f: `MAX(0,100-(E${excelRow}+F${excelRow}+G${excelRow}+H${excelRow}))`,
        s: cellStyle,
      };

      // J = Nề nếp + Học tập + Khen thưởng
      worksheet[`J${excelRow}`] = {
        t: "n",
        f: `I${excelRow}+C${excelRow}+D${excelRow}`,
        s: cellStyle,
      };

      // K = Xếp loại.
      // Theo đúng điều kiện người dùng đã chốt:
      // TỐT: Tổng >= 100 và Nề nếp >= 85
      // KHÁ: Tổng 80-99 và Nề nếp 60-79
      // ĐẠT: Tổng < 60
      // Các khoảng chưa được quy định giữ trống.
      worksheet[`K${excelRow}`] = {
        t: "s",
        f: `IF(AND(J${excelRow}>=110,I${excelRow}>=80),"TỐT",IF(AND(J${excelRow}>=90,J${excelRow}<110,I${excelRow}>=60,I${excelRow}<80),"KHÁ",IF(AND(J${excelRow}<90,I${excelRow}<60),"ĐẠT","")))`,
        s: cellStyle,
      };

      // L = xếp hạng toàn trường, ưu tiên TỐT -> KHÁ -> ĐẠT.
      // Trong cùng loại: Tổng thi đua cao hơn đứng trước.
      worksheet[`L${excelRow}`] = {
        t: "n",
        // Xếp hạng RIÊNG THEO KHỐI:
        // TỐT -> KHÁ -> ĐẠT.
        // Trong cùng loại: Tổng thi đua cao hơn đứng trước.
        // Bằng điểm: đồng hạng.
        f:
          `IF(K${excelRow}="","",` +
          `IF(K${excelRow}="TỐT",` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"TỐT",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1,` +
          `IF(K${excelRow}="KHÁ",` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"TỐT")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"KHÁ",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1,` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"TỐT")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"KHÁ")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"ĐẠT",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1)))`,
        s: cellStyle,
      };
    });

    // Style toàn bộ dữ liệu.
    for (let r = firstDataRow - 1; r <= lastDataRow - 1; r++) {
      for (let c = 0; c < 12; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (worksheet[cell]) {
          worksheet[cell].s = cellStyle;
        }
      }
    }

    // Công thức cần style lại sau vòng trên.
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      ["I", "J", "K", "L"].forEach((col) => {
        if (worksheet[`${col}${r}`]) {
          worksheet[`${col}${r}`].s = cellStyle;
        }
      });

      ["C", "D", "E", "F", "G", "H", "I", "J"].forEach((col) => {
        if (worksheet[`${col}${r}`]) {
          worksheet[`${col}${r}`].z = "0.0";
        }
      });
    }

    worksheet["!cols"] = [
      { wch: 7 },  // STT
      { wch: 10 }, // Lớp
      { wch: 12 }, // Học tập
      { wch: 14 }, // Khen thưởng
      { wch: 11 }, // Vi phạm
      { wch: 12 }, // Xếp hàng
      { wch: 14 }, // Chuyên cần
      { wch: 11 }, // Vệ sinh
      { wch: 14 }, // Tổng nề nếp
      { wch: 11 }, // Tổng
      { wch: 12 }, // Xếp loại
      { wch: 12 }, // Xếp hạng
    ];

    worksheet["!rows"] = [
      { hpt: 25 },
      { hpt: 10 },
      { hpt: 30 },
      { hpt: 10 },
      { hpt: 32 },
      { hpt: 30 },
    ];

    worksheet["!pageSetup"] = {
      orientation: "landscape",
      fitToWidth: 1,
      fitToHeight: 0,
    };

    worksheet["!printOptions"] = {
      horizontalCentered: true,
      verticalCentered: false,
    };

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Thi đua tuần ${selectedWeek}`
    );

    XLSX.writeFile(
      workbook,
      `Tong_Hop_Thi_Dua_Tuan_${selectedWeek}_2026-2027.xlsx`
    );
    } catch (error) {
      console.error("❌ Lỗi xuất Excel:", error);
      alert("❌ Không thể xuất Excel. Vui lòng thử lại.");
    }
  };

  // =========================================================
  // PHẦN SỐ 9 TRỞ XUỐNG: thêm tại đây
  // =========================================================

  const calculateRanks = (
  data: ClassWeeklyScore[]
) => {
  const grades = [
    "6",
    "7",
    "8",
    "9",
  ];

  grades.forEach((grade) => {
    const filtered =
      data.filter(
        (d) =>
          d.grade === grade
      );

    filtered.sort(
      (a, b) =>
        (b.totalScore ?? 0) -
        (a.totalScore ?? 0)
    );

    let currentRank = 1;

    filtered.forEach(
      (d, index) => {
        if (
          index > 0 &&
          d.totalScore ===
            filtered[index - 1]
              .totalScore
        ) {
          d.rank =
            filtered[
              index - 1
            ].rank;
        } else {
          d.rank =
            currentRank;
        }

        currentRank++;
      }
    );
  });
};

  const handleAcademicYearChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const year = e.target.value;

  setSelectedAcademicYear(year);
  setSelectedWeek("");
  setScores([]);
  setHasChanges(false);
  setCurrentWeekNumber(null);
};

  const handleWeekChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const weekNumber =
    Number(e.target.value);

  setSelectedWeek(
    weekNumber
  );

  if (
    selectedAcademicYear &&
    weekNumber
  ) {
    loadScores(
      weekNumber
    );
  }
};



  
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
                      value={row.academicScore ?? 0}
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
