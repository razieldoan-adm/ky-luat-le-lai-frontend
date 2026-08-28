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
  lineUpScore: number;       // âœ… Ä‘á»•i chá»¯ â€œUâ€ â†’ thÆ°á»ng
  violationScore: number;
  attendanceScore: number;
  academicScore: number;
  bonusScore: number;         // âœ… Ä‘á»•i rewardScore â†’ bonusScore
  totalViolation?: number;    // âœ… thÃªm náº¿u backend cÃ³
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

  // --- Load danh sÃ¡ch tuáº§n & tuáº§n hiá»‡n táº¡i
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
        console.error("Lá»—i khi táº£i tuáº§n:", err);
      }
    };
    fetchWeeks();
  }, []);

  // --- Load cáº¥u hÃ¬nh há»‡ thá»‘ng
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

  // --- Load Ä‘iá»ƒm tuáº§n
  const loadScores = async (weekNumber: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/class-weekly-scores/weekly`, { params: { weekNumber } });
      let data: ClassWeeklyScore[] = res.data || [];

      // TÃ­nh Ä‘iá»ƒm ká»· luáº­t vÃ  tá»•ng thi Ä‘ua
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

      // --- Xáº¿p háº¡ng riÃªng theo khá»‘i, cÃ³ Ä‘á»“ng háº¡ng ---
      const grades = ["6", "7", "8", "9"];
      grades.forEach((g) => {
        const filtered = data.filter((d) => d.grade === g);
        filtered.sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));

        let currentRank = 1;
        filtered.forEach((d, i) => {
          if (i > 0 && d.totalScore === filtered[i - 1].totalScore) {
            d.rank = filtered[i - 1].rank; // Ä‘á»“ng háº¡ng vá»›i lá»›p trÆ°á»›c
          } else {
            d.rank = currentRank;
          }
          currentRank++;
        });
      });

      setScores(data);
      setHasChanges(false);
    } catch (err) {
      console.error("Lá»—i khi táº£i Ä‘iá»ƒm:", err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Khi Ä‘á»•i tuáº§n
  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const w = Number(e.target.value);
    setSelectedWeek(w);
    loadScores(w);
  };

  // --- LÆ°u toÃ n bá»™ Ä‘iá»ƒm
  const handleSave = async () => {
  try {
    if (!scores.length || !selectedWeek) {
      alert("âŒ KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ lÆ°u.");
      return;
    }

    const payload = {
      records: scores.map((s) => ({
        className: s.className,
        grade: s.grade,
        weekNumber: s.weekNumber || selectedWeek,
        academicScore: s.academicScore ?? 0,
        bonusScore: s.bonusScore ?? 0, // âœ… Ä‘á»•i rewardScore â†’ bonusScore
        hygieneScore: s.hygieneScore ?? 0,
        lineUpScore: s.lineUpScore ?? 0, // âœ… Ä‘á»•i lineUpScore â†’ lineupScore
        attendanceScore: s.attendanceScore ?? 0,
        violationScore: s.violationScore ?? 0,
        totalViolation: s.totalViolation ?? 0, // âœ… thÃªm má»›i náº¿u cÃ³
        totalScore: s.totalScore ?? 0,
        rank: s.rank ?? 0,
      })),
    };

    // ðŸ”¹ Gá»i API má»›i Ä‘á»ƒ lÆ°u toÃ n bá»™ Ä‘iá»ƒm tuáº§n
    const res = await api.post("/api/class-weekly-scores/save-manual", payload);

    alert("âœ… " + (res.data?.message || "ÄÃ£ lÆ°u toÃ n bá»™ Ä‘iá»ƒm tuáº§n!"));
    loadScores(Number(selectedWeek));
  } catch (err) {
    console.error("âŒ Lá»—i khi lÆ°u:", err);
    alert("âŒ KhÃ´ng thá»ƒ lÆ°u dá»¯ liá»‡u Ä‘iá»ƒm tuáº§n!");
  }
};

  // --- Khi sá»­a Ä‘iá»ƒm há»c táº­p hoáº·c thÆ°á»Ÿng
  const handleChangeScore = (
    className: string,
    field: keyof ClassWeeklyScore,
    value: number
  ) => {
    setHasChanges(true);
    setScores((prev) =>
      prev.map((s) => {
        if (s.className !== className) return s;

        // cáº­p nháº­t giÃ¡ trá»‹ má»›i
        const updated = { ...s, [field]: value };

        // tÃ­nh láº¡i Ä‘iá»ƒm ká»· luáº­t vÃ  tá»•ng thi Ä‘ua
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

  // --- Cáº­p nháº­t láº¡i thá»© háº¡ng (Ä‘á»“ng háº¡ng) ---
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

  // --- Xuáº¥t Excel tá»•ng há»£p 4 khá»‘i
  // Báº¥m 1 láº§n -> táº¡o vÃ  táº£i file ngay, khÃ´ng má»Ÿ dialog.
  const handleExport = () => {
    if (!selectedWeek || !scores.length) {
      alert("âŒ KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t Excel.");
      return;
    }

    // ToÃ n bá»™ khá»‘i 6 -> 7 -> 8 -> 9, trong cÃ¹ng má»™t sheet.
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

    // Header 2 táº§ng giá»‘ng máº«u:
    // E:H = nhÃ³m "Ná» náº¿p".
    const data: (string | number | null)[][] = [
      ["LiÃªn Ä‘á»™i THCS LÃª Lai"],
      [],
      [`Báº¢NG ÄIá»‚M THI ÄUA TUáº¦N ${selectedWeek} - NÄ‚M Há»ŒC: 2026-2027`],
      [],
      [
        "STT",
        "Lá»›p",
        "Há»c táº­p",
        "Khen thÆ°á»Ÿng",
        "Ná» náº¿p",
        null,
        null,
        null,
        "Tá»•ng\nná» náº¿p",
        "Tá»•ng",
        "Xáº¿p loáº¡i",
        "Xáº¿p háº¡ng",
      ],
      [
        null,
        null,
        null,
        null,
        "Vi pháº¡m",
        "Xáº¿p hÃ ng",
        "ChuyÃªn cáº§n",
        "Vá»‡ sinh",
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
        null, // I: cÃ´ng thá»©c
        null, // J: cÃ´ng thá»©c
        null, // K: cÃ´ng thá»©c
        null, // L: cÃ´ng thá»©c
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

    // Header 2 táº§ng.
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

      // I = 100 - (Vi pháº¡m + Xáº¿p hÃ ng + ChuyÃªn cáº§n + Vá»‡ sinh)
      worksheet[`I${excelRow}`] = {
        t: "n",
        f: `MAX(0,100-(E${excelRow}+F${excelRow}+G${excelRow}+H${excelRow}))`,
        s: cellStyle,
      };

      // J = Ná» náº¿p + Há»c táº­p + Khen thÆ°á»Ÿng
      worksheet[`J${excelRow}`] = {
        t: "n",
        f: `I${excelRow}+C${excelRow}+D${excelRow}`,
        s: cellStyle,
      };

      // K = Xáº¿p loáº¡i.
      // Theo Ä‘Ãºng Ä‘iá»u kiá»‡n ngÆ°á»i dÃ¹ng Ä‘Ã£ chá»‘t:
      // Tá»T: Tá»•ng >= 100 vÃ  Ná» náº¿p >= 85
      // KHÃ: Tá»•ng 80-89 vÃ  Ná» náº¿p 60-79
      // Äáº T: Tá»•ng < 60
      // CÃ¡c khoáº£ng chÆ°a Ä‘Æ°á»£c quy Ä‘á»‹nh giá»¯ trá»‘ng.
      worksheet[`K${excelRow}`] = {
        t: "s",
        f: `IF(AND(J${excelRow}>=100,I${excelRow}>=85),"Tá»T",IF(AND(J${excelRow}>=80,J${excelRow}<=89,I${excelRow}>=60,I${excelRow}<=79),"KHÃ",IF(J${excelRow}<60,"Äáº T","")))`,
        s: cellStyle,
      };

      // L = xáº¿p háº¡ng toÃ n trÆ°á»ng, Æ°u tiÃªn Tá»T -> KHÃ -> Äáº T.
      // Trong cÃ¹ng loáº¡i: Tá»•ng thi Ä‘ua cao hÆ¡n Ä‘á»©ng trÆ°á»›c.
      worksheet[`L${excelRow}`] = {
        t: "n",
        // Xáº¿p háº¡ng RIÃŠNG THEO KHá»I, giá»‘ng báº£ng Ä‘ang cÃ³ trÃªn há»‡ thá»‘ng.
        // Trong tá»«ng khá»‘i: Tá»T -> KHÃ -> Äáº T.
        // CÃ¹ng loáº¡i thÃ¬ Tá»•ng thi Ä‘ua cao hÆ¡n Ä‘á»©ng trÆ°á»›c; báº±ng Ä‘iá»ƒm thÃ¬ Ä‘á»“ng háº¡ng.
        f:
          `IF(K${excelRow}="","",` +
          `IF(K${excelRow}="Tá»T",` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"Tá»T",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1,` +
          `IF(K${excelRow}="KHÃ",` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"Tá»T")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"KHÃ",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1,` +
          `COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"Tá»T")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"KHÃ")` +
          `+COUNTIFS($B$${firstDataRow}:$B$${lastDataRow},LEFT(B${excelRow},1)&"*",$K$${firstDataRow}:$K$${lastDataRow},"Äáº T",$J$${firstDataRow}:$J$${lastDataRow},">"&J${excelRow})+1)))`,
        s: cellStyle,
      };
    });

    // Style toÃ n bá»™ dá»¯ liá»‡u.
    for (let r = firstDataRow - 1; r <= lastDataRow - 1; r++) {
      for (let c = 0; c < 12; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (worksheet[cell]) {
          worksheet[cell].s = cellStyle;
        }
      }
    }

    // CÃ´ng thá»©c cáº§n style láº¡i sau vÃ²ng trÃªn.
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
      { wch: 10 }, // Lá»›p
      { wch: 12 }, // Há»c táº­p
      { wch: 14 }, // Khen thÆ°á»Ÿng
      { wch: 11 }, // Vi pháº¡m
      { wch: 12 }, // Xáº¿p hÃ ng
      { wch: 14 }, // ChuyÃªn cáº§n
      { wch: 11 }, // Vá»‡ sinh
      { wch: 14 }, // Tá»•ng ná» náº¿p
      { wch: 11 }, // Tá»•ng
      { wch: 12 }, // Xáº¿p loáº¡i
      { wch: 12 }, // Xáº¿p háº¡ng
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
      `Thi Ä‘ua tuáº§n ${selectedWeek}`
    );

    XLSX.writeFile(
      workbook,
      `Tong_Hop_Thi_Dua_Tuan_${selectedWeek}_2026-2027.xlsx`
    );
  };

  // --- HÃ m render báº£ng theo khá»‘i
  const renderTable = (grade: string) => {
    const list = scores.filter((s) => s.grade === grade);
    if (!list.length) return null;

    return (
      <Box key={grade} mt={4}>
        <Typography variant="h6" fontWeight="bold" mb={1}>
          ðŸ“š Khá»‘i {grade}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lá»›p</TableCell>
               
                <TableCell align="center">Xáº¿p hÃ ng</TableCell>
                <TableCell align="center">Vi pháº¡m</TableCell>
                <TableCell align="center">ChuyÃªn cáº§n</TableCell>
                 <TableCell align="center">Vá»‡ sinh</TableCell>
                <TableCell align="center">Há»c táº­p</TableCell>
                <TableCell align="center">ThÆ°á»Ÿng</TableCell>
                <TableCell align="center">Ká»· luáº­t</TableCell>
                <TableCell align="center">Tá»•ng thi Ä‘ua</TableCell>
                <TableCell align="center">Xáº¿p háº¡ng</TableCell>
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
        ðŸ« Tá»•ng há»£p Ä‘iá»ƒm thi Ä‘ua theo khá»‘i
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          select
          label="Tuáº§n há»c"
          value={selectedWeek}
          onChange={handleWeekChange}
          sx={{ width: 160 }}
        >
          {weeks.map((w) => (
            <MenuItem key={w} value={w}>
              Tuáº§n {w}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" color="primary" onClick={handleSave}>
          ðŸ’¾ LÆ°u Ä‘iá»ƒm
        </Button>

        <Button
  variant="outlined"
  color="secondary"
  onClick={handleRecalculateRanks}
  disabled={!hasChanges || loadingRank}
>
  {loadingRank ? "â³ Äang xáº¿p háº¡ng..." : "ðŸ“Š Xáº¿p háº¡ng"}
</Button>


        <Button variant="outlined" color="success" onClick={handleExport}>
          ðŸ“¤ Xuáº¥t Excel
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
