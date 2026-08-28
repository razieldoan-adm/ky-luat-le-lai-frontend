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

  // --- Xuất Excel tổng hợp 4 khối
  // Bấm 1 lần -> tạo và tải file ngay, không mở dialog.
  const handleExport = () => {
    if (!selectedWeek || !scores.length) {
      alert("❌ Không có dữ liệu để xuất Excel.");
      return;
    }

    // Toàn bộ khối 6 -> 7 -> 8 -> 9, trong cùng một sheet.
    const allScores = ["6", "7", "8", "9"]
      .flatMap((grade) =>
        scores
          .filter((s) => s.grade === grade)
          .sort((a, b) =>
            a.className.localeCompare(b.className, undefined, {
              numeric: true,
            })
          )
      );

    const rows = allScores.map((row, index) => ({
      stt: index + 1,
      className: row.className,
      academic: row.academicScore ?? 0,
      bonus: row.bonusScore ?? 0,
      violation: row.violationScore ?? 0,
      lineUp: row.lineUpScore ?? 0,
      attendance: (row.attendanceScore ?? 0) * 5,
      hygiene: row.hygieneScore ?? 0,
    }));

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
      // KHÁ: Tổng 80-89 và Nề nếp 60-79
      // ĐẠT: Tổng < 60
      // Các khoảng chưa được quy định giữ trống.
      worksheet[`K${excelRow}`] = {
        t: "s",
        f: `IF(AND(J${excelRow}>=100,I${excelRow}>=85),"TỐT",IF(AND(J${excelRow}>=80,J${excelRow}<=89,I${excelRow}>=60,I${excelRow}<=79),"KHÁ",IF(J${excelRow}<60,"ĐẠT","")))`,
        s: cellStyle,
      };

      // L = xếp hạng toàn trường, ưu tiên TỐT -> KHÁ -> ĐẠT.
      // Trong cùng loại: Tổng thi đua cao hơn đứng trước.
      worksheet[`L${excelRow}`] = {
        t: "n",
        // Xếp hạng RIÊNG THEO KHỐI, giống bảng đang có trên hệ thống.
        // Trong từng khối: TỐT -> KHÁ -> ĐẠT.
        // Cùng loại thì Tổng thi đua cao hơn đứng trước; bằng điểm thì đồng hạng.
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
