// ✅ src/pages/ViewViolationListPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Alert,
} from "@mui/material";
import api from "../api/api";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import useAcademicWeeks from "../types/useAcademicWeeks";
import CircularProgress from "@mui/material/CircularProgress";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import * as XLSX from "xlsx-js-style";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  weekNumber?: number;
  handled?: boolean;
  handledBy?: string;
  studentId?: string;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
}

export default function ViewViolationListPage() {
  const [allViolations, setAllViolations] = useState<Violation[]>([]);
  const [filteredViolations, setFilteredViolations] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { weeks, selectedWeek, setSelectedWeek} = useAcademicWeeks();
  const [isProcessing, setIsProcessing] = useState(false);
  // ✅ Cài đặt giới hạn GVCN
  const [limitGVCN, setLimitGVCN] = useState(false);
  const [classViolationLimit, setClassViolationLimit] = useState<number>(0);

// ============================
// Xuất Excel - chọn khoảng thời gian
// ============================
const [exportDialogOpen, setExportDialogOpen] = useState(false);
const [exportFromDate, setExportFromDate] = useState(
  dayjs().startOf("month").format("YYYY-MM-DD")
);
const [exportToDate, setExportToDate] = useState(
  dayjs().format("YYYY-MM-DD")
);
const [isExporting, setIsExporting] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "warning" | "error" | "success",
  });

  useEffect(() => {
    fetchSetting();
    fetchClasses();
    fetchRules();
    fetchViolations();
  }, []);
      const applyFilters = useCallback((sourceData = allViolations) => {
        let data = [...sourceData];
      
        if (selectedClass) {
          data = data.filter(
            (v) =>
              v.className.trim().toLowerCase() ===
              selectedClass.trim().toLowerCase()
          );
        }
      
        if (viewMode === "week" && selectedWeek) {
          const selectedWeekData = weeks.find(
            (w: any) => w.weekNumber === selectedWeek
          );
          if (selectedWeekData) {
            data = data.filter((v) => {
              const date = dayjs(v.time);
              return (
                date.isSameOrAfter(dayjs(selectedWeekData.startDate), "day") &&
                date.isSameOrBefore(dayjs(selectedWeekData.endDate), "day")
              );
            });
          }
        }
      
        if (viewMode === "day") {
          data = data.filter((v) =>
            dayjs(v.time).isSame(dayjs(selectedDate), "day")
          );
        }
      
        setFilteredViolations(data);
      }, [selectedClass, selectedWeek, selectedDate, viewMode, weeks, allViolations]);
useEffect(() => {
  if (allViolations.length > 0) {
    applyFilters(allViolations);
  }
}, [selectedClass, selectedWeek, selectedDate, viewMode, allViolations, applyFilters]);


  useEffect(() => {
  if (allViolations.length === 0) return;

  let filtered = [...allViolations];

  // 🔹 Lọc theo tuần (nếu chế độ tuần)
  if (viewMode === "week" && selectedWeek) {
    const selectedWeekData = weeks.find((w: any) => w.weekNumber === selectedWeek);
    if (selectedWeekData) {
      filtered = filtered.filter((v) => {
        const date = dayjs(v.time);
        return (
          date.isSameOrAfter(dayjs(selectedWeekData.startDate), "day") &&
          date.isSameOrBefore(dayjs(selectedWeekData.endDate), "day")
        );
      });
    }
  }

  // 🔹 Lọc theo ngày (nếu chế độ ngày)
  if (viewMode === "day") {
    filtered = filtered.filter((v) =>
      dayjs(v.time).isSame(dayjs(selectedDate), "day")
    );
  }
}, [allViolations, selectedWeek, selectedDate, viewMode, weeks]); // ✅ Thêm dòng này

 
  const fetchSetting = async () => {
    try {
      const res = await api.get("/api/settings");
      setLimitGVCN(res.data?.limitGVCNHandling ?? false);
      setClassViolationLimit(res.data?.classViolationLimit ?? 0);
    } catch (err) {
      console.error("Lỗi khi lấy setting:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      const validClasses = res.data
        .filter((cls: any) => cls.teacher)
        .map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách lớp:", err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get("/api/rules");
      setRules(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy rules:", err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get("/api/violations/all/all-student");
      const data = res.data.map((v: any) => ({
        ...v,
        handledBy: v.handledBy || "",
        handled: v.handled || false,
      }));
      setAllViolations(data);
      applyFilters(data);
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu vi phạm:", err);
    }
  };

  const handleProcessViolation = async (id: string, by: "GVCN" | "PGT") => {
    try {
      await api.patch(`/api/violations/${id}/handle`, {
        handled: true,
        handledBy: by,
        handlingMethod: `${by} xử lý`,
      });
      await fetchViolations();
    } catch (err) {
      console.error("Lỗi khi xử lý vi phạm:", err);
    }
  };

  const renderTime = (date: Date) => dayjs(date).format("DD/MM/YYYY");

  // ✅ Tổng điểm trừ (chỉ tính PGT xử lý)
  const classTotals: Record<string, number> = {};
  filteredViolations.forEach((v) => {
    const matchedRule = rules.find((r) => r.title === v.description);
    const point = matchedRule?.point || 0;
    if (v.handledBy === "PGT") {
      classTotals[v.className] = (classTotals[v.className] || 0) + point;
    }
  });
// ============================
// XUẤT EXCEL THEO KHOẢNG THỜI GIAN
// ============================
const handleExportExcel = async () => {
  if (!exportFromDate || !exportToDate) {
    setSnackbar({
      open: true,
      message: "⚠️ Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.",
      severity: "warning",
    });
    return;
  }

  if (dayjs(exportFromDate).isAfter(dayjs(exportToDate), "day")) {
    setSnackbar({
      open: true,
      message: "⚠️ Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      severity: "warning",
    });
    return;
  }

  try {
    setIsExporting(true);

    // ============================
    // LẤY DỮ LIỆU VI PHẠM
    // ============================
    const res = await api.get("/api/violations/all/all-student");

    const violations: Violation[] = Array.isArray(res.data)
      ? res.data
      : [];

    // ============================
    // LỌC THEO KHOẢNG THỜI GIAN
    // ============================
    const fromDate = dayjs(exportFromDate).startOf("day");
    const toDate = dayjs(exportToDate).endOf("day");

    const dataToExport = violations
      .filter((v) => {
        const violationDate = dayjs(v.time);

        return (
          violationDate.isSameOrAfter(fromDate) &&
          violationDate.isSameOrBefore(toDate)
        );
      })
      .sort((a, b) => {
        return dayjs(a.time).valueOf() - dayjs(b.time).valueOf();
      });

    if (dataToExport.length === 0) {
      setSnackbar({
        open: true,
        message:
          "⚠️ Không có học sinh vi phạm trong khoảng thời gian đã chọn.",
        severity: "warning",
      });
      return;
    }

    // ============================
    // TIÊU ĐỀ
    // ============================
    const title = "DANH SÁCH HS VI PHẠM NỘI QUI";

    const dateRange =
      `Từ ngày ${dayjs(exportFromDate).format("DD/MM/YYYY")}` +
      ` đến ngày ${dayjs(exportToDate).format("DD/MM/YYYY")}`;

    // ============================
    // HEADER
    // ============================
    const headers = [
      "STT",
      "HỌ VÀ TÊN",
      "LỚP",
      "LỖI VI PHẠM",
      "SỐ LẦN VI PHẠM CÙNG 1 LỖI TRONG NGÀY",
      "THỜI GIAN",
      "GHI CHÚ",
    ];

    // ============================
    // DỮ LIỆU
    // ============================
    const rows = dataToExport.map((v) => {
  const key =
    `${v.name?.trim().toLowerCase()}|` +
    `${v.className?.trim().toLowerCase()}|` +
    `${v.description?.trim().toLowerCase()}|` +
    `${dayjs(v.time).format("YYYY-MM-DD")}`;

  const violationCount = violationCountMap[key] || 0;

  return [
    "",
    v.name || "",
    v.className || "",
    v.description || "",
    violationCount,
    dayjs(v.time).format("DD/MM/YYYY"),
    "",
  ];
});

    // ============================
    // TẠO WORKSHEET
    // ============================
    const worksheet = XLSX.utils.aoa_to_sheet([
      [title],
      [dateRange],
      [],
      headers,
      ...rows,
    ]);

    // ============================
    // MERGE TIÊU ĐỀ
    // ============================
    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: headers.length - 1 },
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: headers.length - 1 },
      },
    ];

    // ============================
    // FONT CHUNG
    // ============================
    const normalFont = {
      name: "Times New Roman",
      sz: 14,
    };

    const boldFont = {
      name: "Times New Roman",
      sz: 14,
      bold: true,
    };

    // ============================
    // STYLE TIÊU ĐỀ
    // ============================
    worksheet["A1"].s = {
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

    worksheet["A2"].s = {
      font: {
        name: "Times New Roman",
        sz: 14,
        italic: true,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    // ============================
    // STYLE HEADER
    // ============================
    for (let col = 0; col < headers.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: 3,
        c: col,
      });

      worksheet[cellAddress].s = {
        font: boldFont,
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: {
            style: "thin",
            color: { rgb: "000000" },
          },
          bottom: {
            style: "thin",
            color: { rgb: "000000" },
          },
          left: {
            style: "thin",
            color: { rgb: "000000" },
          },
          right: {
            style: "thin",
            color: { rgb: "000000" },
          },
        },
      };
    }

    // ============================
    // STYLE DỮ LIỆU
    // ============================
    for (let row = 4; row < 4 + rows.length; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({
          r: row,
          c: col,
        });

        const cell = worksheet[cellAddress];

        if (!cell) continue;

        // Căn lề
        let horizontal:
          | "left"
          | "center"
          | "right" = "center";

        // Họ tên + lỗi vi phạm căn trái
        if (col === 1 || col === 3) {
          horizontal = "left";
        }

        cell.s = {
          font: normalFont,
          alignment: {
            horizontal,
            vertical: "center",
            wrapText: true,
          },
          border: {
            top: {
              style: "thin",
              color: { rgb: "000000" },
            },
            bottom: {
              style: "thin",
              color: { rgb: "000000" },
            },
            left: {
              style: "thin",
              color: { rgb: "000000" },
            },
            right: {
              style: "thin",
              color: { rgb: "000000" },
            },
          },
        };
      }
    }

    // ============================
    // ĐỊNH DẠNG CỘT
    // ============================
    worksheet["!cols"] = [
  { wch: 7 },   // STT
  { wch: 28 },  // Họ tên
  { wch: 10 },  // Lớp
  { wch: 55 },  // Lỗi vi phạm
  { wch: 22 },  // Số lần
  { wch: 17 },  // Thời gian
  { wch: 35 },  // Ghi chú
];

    // ============================
    // CHIỀU CAO DÒNG
    // ============================
    worksheet["!rows"] = [
      { hpt: 28 }, // tiêu đề
      { hpt: 22 }, // khoảng thời gian
      { hpt: 8 },  // dòng trống
      { hpt: 35 }, // header
    ];

    // Dòng dữ liệu
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 4;

      if (!worksheet["!rows"]) {
        worksheet["!rows"] = [];
      }

      worksheet["!rows"][rowIndex] = {
        hpt: 32,
      };
    }

    // ============================
    // AUTO FILTER
    // ============================
    worksheet["!autofilter"] = {
      ref: `A4:G${rows.length + 4}`,
    };

    // ============================
    // TẠO WORKBOOK
    // ============================
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "DS HS vi phạm"
    );

    // ============================
    // TÊN FILE
    // ============================
    const fileName =
      `DS_HS_VI_PHAM_NOI_QUI_` +
      `${dayjs(exportFromDate).format("DD-MM-YYYY")}_` +
      `${dayjs(exportToDate).format("DD-MM-YYYY")}.xlsx`;

    // ============================
    // XUẤT FILE
    // ============================
    XLSX.writeFile(workbook, fileName);

    setExportDialogOpen(false);

    setSnackbar({
      open: true,
      message:
        `✅ Đã xuất ${dataToExport.length} lượt vi phạm.`,
      severity: "success",
    });
  } catch (error) {
    console.error("Lỗi xuất Excel:", error);

    setSnackbar({
      open: true,
      message: "❌ Có lỗi xảy ra khi xuất Excel.",
      severity: "error",
    });
  } finally {
    setIsExporting(false);
  }
};

     // ============================
    // ket thuc xuat file
    // ============================ 
  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", py: 4 }}>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        QUẢN LÝ VI PHẠM CỦA HỌC SINH
      </Typography>

      <Box sx={{ mb: 3 }}>
        
        <Alert 
          severity="warning" 
          variant="outlined" 
          sx={{ 
            mt: 2, 
            textAlign: "left", 
            whiteSpace: "pre-line", 
            fontSize: "0.9rem",
            borderColor: "#ffb300",
            backgroundColor: "#fff8e1",
          }}
        >
          <strong style={{ color: "#e65100" }}>* Thầy/cô GVCN vui lòng chú ý :</strong>
          {`\n
          - Nếu thầy/cô GVCN đã xử lý vi phạm của học sinh vui lòng check vào nút "GVCN tiếp nhận".
          - Phần duyệt học sinh vi phạm, mỗi học sinh chỉ được duyệt 1 lần, từ lần thứ 2 trở đi bắt buộc bị trừ điểm thi đua của lớp.
          - Về phần mỗi lớp, sau khi có 5 học sinh được GVCN tiếp nhận xử lý thì lần vi phạm thứ 6 của lớp sẽ bắt buộc trừ điểm thi đua lớp.
          * Các phần duyệt xử lý trên đã được BGH thông qua và PGT sẽ áp dụng để tính điểm thi đua.
          Cách tính điểm trên để công bằng hơn trong việc tính điểm thi đua cho các lớp ít vi phạm và nhiều vi phạm. 
            Xin cám ơn thầy/cô GVCN!`}
        </Alert>
      </Box>
      
      {/* --- Bộ lọc --- */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          select
          label="Chọn lớp"
          value={selectedClass || ""}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return; // tránh lỗi khi chưa có dữ liệu
            setSelectedClass(value);
          }}
          sx={{ minWidth: 150 }}
          
        >
          <MenuItem value="">-- Tất cả lớp --</MenuItem>
          {Array.isArray(classList) &&
            classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
        </TextField>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Chế độ xem</InputLabel>
          <Select
            value={viewMode}
            label="Chế độ xem"
            onChange={(e) => setViewMode(e.target.value as "week" | "day")}
          >
            <MenuItem value="week">Theo tuần</MenuItem>
            <MenuItem value="day">Theo ngày</MenuItem>
          </Select>
        </FormControl>

        {viewMode === "week" && (
          <>
            <TextField
              select
              label="Chọn tuần"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              sx={{ minWidth: 150 }}
            >
              {weeks.map((w: any) => (
                <MenuItem key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} ({dayjs(w.startDate).format("DD/MM")} -{" "}
                  {dayjs(w.endDate).format("DD/MM")})
                </MenuItem>
              ))}
            </TextField>
          </>
        )}

        {viewMode === "day" && (
          <TextField
            label="Chọn ngày"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ minWidth: 180 }}
          />
        )}
      </Stack>
      <Button
  variant="contained"
  color="success"
  onClick={() => setExportDialogOpen(true)}
  sx={{
    minHeight: 56,
    fontWeight: "bold",
  }}
>
  📊 Xuất Excel
</Button>
      {/* --- Bảng dữ liệu --- */}
      <Paper elevation={3} sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#87cafe" }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Điểm trừ</TableCell>
              <TableCell>Ngày</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Tiếp nhận xử lý</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredViolations.map((v, idx) => {
              const matchedRule = rules.find((r) => r.title === v.description);
              return (
                <TableRow key={v._id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{matchedRule?.point || 0}</TableCell>
                  <TableCell>{renderTime(v.time)}</TableCell>
                  <TableCell>
                    {v.handled ? (
                      <Box
                        sx={{
                          backgroundColor: "green",
                          color: "white",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Đã xử lý
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          backgroundColor: "#ffcccc",
                          color: "red",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        Chưa xử lý
                      </Box>
                    )}
                  </TableCell>

                  {/* ✅ Button xử lý có giới hạn GVCN */}
                  <TableCell> {v.handledBy === "PGT" ? ( 
                    <Typography color="gray" fontStyle="italic"> 
                      PGT đã xử lý 
                    </Typography> 
                  ) : !v.handled ? (
                <Button
                  variant={v.handledBy === "GVCN" ? "contained" : "outlined"}
                  color="primary"
                  size="small"
disabled={
  isProcessing || // ✅ khóa toàn bộ khi đang xử lý
  (() => {
    const currentWeek = weeks.find(
      (w: any) =>
        dayjs(v.time).isSameOrAfter(dayjs(w.startDate), "day") &&
        dayjs(v.time).isSameOrBefore(dayjs(w.endDate), "day")
    );
    if (!currentWeek) return false;

    const sameStudentThisWeek = allViolations.filter(
      (item) =>
        item._id !== v._id &&
        item.name?.trim().toLowerCase() === v.name?.trim().toLowerCase() &&
        item.className?.trim().toLowerCase() === v.className?.trim().toLowerCase() &&
        dayjs(item.time).isSameOrAfter(dayjs(currentWeek.startDate), "day") &&
        dayjs(item.time).isSameOrBefore(dayjs(currentWeek.endDate), "day")
    );

    const hasHandledByGVCN = sameStudentThisWeek.some(
      (item) => item.handledBy === "GVCN"
    );
    if (limitGVCN && hasHandledByGVCN) return true;

    const classHandledThisWeek = allViolations.filter(
      (item) =>
        item.className?.trim().toLowerCase() === v.className?.trim().toLowerCase() &&
        item.handledBy === "GVCN" &&
        dayjs(item.time).isSameOrAfter(dayjs(currentWeek.startDate), "day") &&
        dayjs(item.time).isSameOrBefore(dayjs(currentWeek.endDate), "day")
    ).length;

    return classViolationLimit > 0 && classHandledThisWeek >= classViolationLimit;
  })()
}

                  onClick={async () => {
                    setIsProcessing(true); // ✅ chống click nhanh
                    try {
                      const currentWeek = weeks.find(
                        (w: any) =>
                          dayjs(v.time).isSameOrAfter(dayjs(w.startDate), "day") &&
                          dayjs(v.time).isSameOrBefore(dayjs(w.endDate), "day")
                      );
                
                      if (!currentWeek) return await handleProcessViolation(v._id, "GVCN");
                
                      const sameStudentThisWeek = allViolations.filter(
                        (item) =>
                          item._id !== v._id &&
                          item.name?.trim().toLowerCase() === v.name?.trim().toLowerCase() &&
                          item.className?.trim().toLowerCase() === v.className?.trim().toLowerCase() &&
                          dayjs(item.time).isSameOrAfter(dayjs(currentWeek.startDate), "day") &&
                          dayjs(item.time).isSameOrBefore(dayjs(currentWeek.endDate), "day")
                      );
                
                      const hasHandledByGVCN = sameStudentThisWeek.some(
                        (item) => item.handledBy === "GVCN"
                      );
                      if (limitGVCN && hasHandledByGVCN)
                        return setSnackbar({
                          open: true,
                          message: "⚠️ Học sinh này đã được GVCN xử lý trong tuần.",
                          severity: "warning",
                        });
                
                      const classHandledThisWeek = allViolations.filter(
                        (item) =>
                          item.className?.trim().toLowerCase() === v.className?.trim().toLowerCase() &&
                          item.handledBy === "GVCN" &&
                          dayjs(item.time).isSameOrAfter(dayjs(currentWeek.startDate), "day") &&
                          dayjs(item.time).isSameOrBefore(dayjs(currentWeek.endDate), "day")
                      ).length;
                
                      if (classViolationLimit > 0 && classHandledThisWeek >= classViolationLimit)
                        return setSnackbar({
                          open: true,
                          message:
                            "⚠️ Lớp này đã đạt giới hạn xử lý vi phạm trong tuần. Không thể tiếp nhận thêm.",
                          severity: "warning",
                        });
                
                      await handleProcessViolation(v._id, "GVCN");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                >
                  {isProcessing ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "GVCN tiếp nhận"
                  )}
                </Button>

                  ) : (
                    <Typography color="green" fontWeight="bold"> 
                      ✓ GVCN đã xử lý 
                    </Typography> )} 
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* ============================
    DIALOG XUẤT EXCEL
============================ */}
<Dialog
  open={exportDialogOpen}
  onClose={() => {
    if (!isExporting) {
      setExportDialogOpen(false);
    }
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle sx={{ fontWeight: "bold" }}>
    📊 Xuất danh sách học sinh vi phạm
  </DialogTitle>

  <DialogContent>
    <Typography
      color="text.secondary"
      sx={{ mb: 3, mt: 1 }}
    >
      Chọn khoảng thời gian cần xuất. Tất cả lỗi vi phạm
      trong khoảng thời gian này sẽ được xuất ra Excel.
      Sau đó có thể lọc lỗi trực tiếp trong Excel.
    </Typography>

    <Stack spacing={2}>
      <TextField
        label="Từ ngày"
        type="date"
        value={exportFromDate}
        onChange={(e) => setExportFromDate(e.target.value)}
        fullWidth
        InputLabelProps={{
          shrink: true,
        }}
      />

      <TextField
        label="Đến ngày"
        type="date"
        value={exportToDate}
        onChange={(e) => setExportToDate(e.target.value)}
        fullWidth
        InputLabelProps={{
          shrink: true,
        }}
      />
    </Stack>
  </DialogContent>

  <DialogActions sx={{ px: 3, pb: 2 }}>
    <Button
      onClick={() => setExportDialogOpen(false)}
      disabled={isExporting}
    >
      Hủy
    </Button>

    <Button
      variant="contained"
      color="success"
      onClick={handleExportExcel}
      disabled={isExporting}
    >
      {isExporting ? (
        <>
          <CircularProgress
            size={20}
            color="inherit"
            sx={{ mr: 1 }}
          />
          Đang xuất...
        </>
      ) : (
        "📊 Xuất Excel"
      )}
    </Button>
  </DialogActions>
</Dialog>
      
      {/* ✅ Snackbar hiển thị cảnh báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* --- Tổng điểm trừ --- */}
      <Box mt={4}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Tổng điểm trừ:
        </Typography>
        <Table size="small" sx={{ maxWidth: 500 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>Lớp</TableCell>
              <TableCell align="right">Tổng điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(classTotals).map(([cls, total]) => (
              <TableRow key={cls}>
                <TableCell>{cls}</TableCell>
                <TableCell align="right">{total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
