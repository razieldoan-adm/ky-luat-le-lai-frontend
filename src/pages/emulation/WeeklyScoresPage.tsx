import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import {
  Box, Typography, CircularProgress, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import api from "../../api/api";

interface ClassWeeklyScore {
  _id?: string;
  className: string;
  grade: string;
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
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [scores, setScores] = useState<ClassWeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ maxDiscipline: number }>({ maxDiscipline: 100 });
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingRank, setLoadingRank] = useState(false);

  // --- Load danh sách tuần & tuần hiện tại
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await api.get("/api/class-weekly-scores/weeks");
        const list = res.data || [];
        setWeeks(list);
        const current = Math.max(...list);
        setSelectedWeek(current);
        loadScores(current);
      } catch (err) {
        console.error("Lỗi khi tải tuần:", err);
      }
    };
    fetchWeeks();
  }, []);

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
      const res = await api.get(`/api/class-weekly-scores/weekly`, { params: { weekNumber } });
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
  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const w = Number(e.target.value);
    setSelectedWeek(w);
    loadScores(w);
  };

  // --- Lưu toàn bộ điểm
  const handleSave = async () => {
  try {
    if (!scores.length || !selectedWeek) {
      alert("❌ Không có dữ liệu để lưu.");
      return;
    }

    const payload = {
      records: scores.map((s) => ({
        className: s.className,
        grade: s.grade,
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

// --- Xuất Excel tổng hợp toàn trường ---
const handleExport = () => {
  if (!selectedWeek || !scores.length) {
    alert("❌ Không có dữ liệu để xuất Excel.");
    return;
  }

  // Lấy toàn bộ 4 khối
  const allScores = ["6", "7", "8", "9"]
    .flatMap((grade) =>
      scores.filter((s) => s.grade === grade)
    )
    .sort((a, b) => {
      const gradeA = Number(a.grade);
      const gradeB = Number(b.grade);

      if (gradeA !== gradeB) return gradeA - gradeB;

      return a.className.localeCompare(b.className, undefined, {
        numeric: true,
      });
    });

  // ---------------------------------------------------------
  // TÍNH DỮ LIỆU XUẤT EXCEL
  // ---------------------------------------------------------

  const exportData = allScores.map((row, index) => ({
    STT: index + 1,
    Lớp: row.className,

    // Học tập và thưởng mặc định = 0
    "Học tập": 0,
    "Thưởng": 0,

    // Các khoản lấy từ hệ thống, thiếu = 0
    "Xếp hàng": row.lineUpScore ?? 0,
    "Vi phạm": row.violationScore ?? 0,

    // attendanceScore trong hệ thống là số HS nghỉ
    // => điểm chuyên cần = số HS nghỉ x 5
    "Chuyên cần": (row.attendanceScore ?? 0) * 5,

    "Vệ sinh": row.hygieneScore ?? 0,

    // Các cột này sẽ được thay bằng công thức Excel bên dưới
    "Nề nếp": 0,
    "Tổng thi đua": 0,
    "Xếp loại": "",
    "Xếp hạng": "",
  }));

  // ---------------------------------------------------------
  // TẠO WORKBOOK
  // ---------------------------------------------------------

  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["LIÊN ĐỘI THCS LÊ LAI"],
    [`BẢNG TỔNG HỢP ĐIỂM THI ĐUA TUẦN ${selectedWeek}`],
    ["Năm học: 2026 - 2027"],
    [],
    [
      "STT",
      "Lớp",
      "Học tập",
      "Thưởng",
      "Xếp hàng",
      "Vi phạm",
      "Chuyên cần",
      "Vệ sinh",
      "Nề nếp",
      "Tổng thi đua",
      "Xếp loại",
      "Xếp hạng",
    ],
    ...exportData.map((row) => [
      row.STT,
      row.Lớp,
      row["Học tập"],
      row["Thưởng"],
      row["Xếp hàng"],
      row["Vi phạm"],
      row["Chuyên cần"],
      row["Vệ sinh"],
      row["Nề nếp"],
      row["Tổng thi đua"],
      row["Xếp loại"],
      row["Xếp hạng"],
    ]),
  ]);

  // ---------------------------------------------------------
  // MERGE TIÊU ĐỀ
  // ---------------------------------------------------------

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 11 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: 11 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: 11 },
    },
  ];

  // ---------------------------------------------------------
  // CÔNG THỨC EXCEL
  // ---------------------------------------------------------

  const headerRow = 5;

  allScores.forEach((_, index) => {
    const excelRow = headerRow + index;

    // Cột:
    // E = Xếp hàng
    // F = Vi phạm
    // G = Chuyên cần
    // H = Vệ sinh
    // I = Nề nếp
    // C = Học tập
    // D = Thưởng
    // J = Tổng thi đua
    // K = Xếp loại
    // L = Xếp hạng

    worksheet[`I${excelRow}`] = {
      t: "n",
      f: `MAX(0,100-(E${excelRow}+F${excelRow}+G${excelRow}+H${excelRow}))`,
    };

    worksheet[`J${excelRow}`] = {
      t: "n",
      f: `I${excelRow}+C${excelRow}+D${excelRow}`,
    };

    // XẾP LOẠI
    //
    // TỐT:
    // Tổng >= 100 và Nề nếp >= 85
    //
    // KHÁ:
    // Tổng từ 80 đến 89 và Nề nếp từ 60 đến 79
    //
    // ĐẠT:
    // Tổng < 60
    worksheet[`K${excelRow}`] = {
      t: "s",
      f: `IF(AND(J${excelRow}>=100,I${excelRow}>=85),"TỐT",IF(AND(J${excelRow}>=80,J${excelRow}<=89,I${excelRow}>=60,I${excelRow}<=79),"KHÁ",IF(J${excelRow}<60,"ĐẠT","")))`,
    };
  });

  // ---------------------------------------------------------
  // XẾP HẠNG
  // ƯU TIÊN: TỐT -> KHÁ -> ĐẠT
  // Trong cùng loại: Tổng thi đua cao hơn đứng trước
  // ---------------------------------------------------------

  const firstDataRow = headerRow;
  const lastDataRow = headerRow + allScores.length - 1;

  allScores.forEach((_, index) => {
    const excelRow = headerRow + index;

    worksheet[`L${excelRow}`] = {
      t: "n",
      f:
        `COUNTIFS($K$${firstDataRow}:$K$${lastDataRow},"<"&K${excelRow})` +
        `+COUNTIFS($K$${firstDataRow}:$K$${lastDataRow},K${excelRow},$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1`,
    };
  });

  // ---------------------------------------------------------
  // STYLE
  // ---------------------------------------------------------

  const titleStyle = {
    font: {
      name: "Arial",
      sz: 16,
      bold: true,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };

  const subTitleStyle = {
    font: {
      name: "Arial",
      sz: 13,
      bold: true,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  };

  const headerStyle = {
    font: {
      name: "Arial",
      sz: 11,
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
  };

  const cellStyle = {
    font: {
      name: "Arial",
      sz: 11,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
    border: {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    },
  };

  // Tiêu đề
  worksheet["A1"].s = titleStyle;
  worksheet["A2"].s = titleStyle;
  worksheet["A3"].s = subTitleStyle;

  // Header
  for (let col = 0; col < 12; col++) {
    const cell = XLSX.utils.encode_cell({
      r: 4,
      c: col,
    });

    if (worksheet[cell]) {
      worksheet[cell].s = headerStyle;
    }
  }

  // Dữ liệu
  for (let row = firstDataRow - 1; row <= lastDataRow - 1; row++) {
    for (let col = 0; col < 12; col++) {
      const cell = XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

      if (worksheet[cell]) {
        worksheet[cell].s = cellStyle;
      }
    }
  }

  // ---------------------------------------------------------
  // ĐỊNH DẠNG SỐ
  // ---------------------------------------------------------

  for (let row = firstDataRow; row <= lastDataRow; row++) {
    ["C", "D", "E", "F", "G", "H", "I", "J"].forEach((col) => {
      if (worksheet[`${col}${row}`]) {
        worksheet[`${col}${row}`].z = "0.0";
      }
    });
  }

  // ---------------------------------------------------------
  // ĐỘ RỘNG CỘT
  // ---------------------------------------------------------

  worksheet["!cols"] = [
    { wch: 7 },   // STT
    { wch: 12 },  // Lớp
    { wch: 12 },  // Học tập
    { wch: 12 },  // Thưởng
    { wch: 12 },  // Xếp hàng
    { wch: 12 },  // Vi phạm
    { wch: 14 },  // Chuyên cần
    { wch: 12 },  // Vệ sinh
    { wch: 12 },  // Nề nếp
    { wch: 15 },  // Tổng
    { wch: 12 },  // Xếp loại
    { wch: 12 },  // Xếp hạng
  ];

  // Chiều cao
  worksheet["!rows"] = [
    { hpt: 25 },
    { hpt: 24 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 40 },
  ];

  // ---------------------------------------------------------
  // IN ẤN
  // ---------------------------------------------------------

  worksheet["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
  };

  worksheet["!printOptions"] = {
    horizontalCentered: true,
    verticalCentered: false,
  };

  // ---------------------------------------------------------
  // TÊN SHEET
  // ---------------------------------------------------------

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    `Thi đua tuần ${selectedWeek}`
  );

  // ---------------------------------------------------------
  // DOWNLOAD NGAY - KHÔNG DIALOG
  // ---------------------------------------------------------

  XLSX.writeFile(
    workbook,
    `Tong_Hop_Thi_Dua_Tuan_${selectedWeek}_2026-2027.xlsx`
  );
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

      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Tuần học"
          value={selectedWeek}
          onChange={handleWeekChange}
          sx={{ width: 160 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuần {w}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" color="primary" onClick={handleSave}>
          💾 Lưu điểm
        </Button>

        <Button
  variant="outlined"
  color="secondary"
  onClick={handleRecalculateRanks}
  disabled={!hasChanges || loadingRank}
>
  {loadingRank ? "⏳ Đang xếp hạng..." : "📊 Xếp hạng"}
</Button>


        <Button variant="outlined" color="success" onClick={handleExport}>
          📤 Xuất Excel
        </Button>
      </Box>

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
