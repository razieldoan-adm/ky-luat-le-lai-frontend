import { useEffect, useState, useRef, type ChangeEvent, } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Divider,
} from "@mui/material";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

// ============================================================
// INTERFACE
// ============================================================

interface Violation {
  _id: string;
  description: string;

  ruleCode?: string;
  groupCode?: string;

  time?: string;
  handled: boolean;
  handlingMethod: string;
  handledBy?: string;
  handlingNote?: string;
  weekNumber?: number;
  penalty?: number;
  images?: {
  fileId: string;
  url: string;
}[];
}

interface Rule {
  _id: string;
  title: string;
  point: number;

  ruleCode: string;
  groupCode: string;
  groupName?: string;
  
  content?: string;
  active?: boolean;
}

interface StudentConductScore {
  _id?: string;

  name: string;
  className: string;
  academicYear: string;
  weekNumber: number;

  maxScore: number;

  groupViolations: {
    N1: number;
    N2: number;
    N3: number;
    N4: number;
    N5: number;
    S1: number;
  };

  totalConductViolations: number;
  totalDeduction: number;
  finalScore: number;

  hasSeriousViolation: boolean;

  status: "DRAFT" | "FINAL";
}

// ============================================================
// COMPONENT
// ============================================================

const ViolationDetailPage = () => {
  const { name } = useParams<{ name: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const className =
    new URLSearchParams(location.search).get("className") || "";

  // ==========================================================
  // STATE
  // ==========================================================

  const [violations, setViolations] = useState<Violation[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [selectedRuleId, setSelectedRuleId] = useState("");

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error"
  >("success");

  // ==========================================================
  // TUẦN HIỆN TẠI
  // ==========================================================

  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState<string>("");
  const getCurrentAcademicYear = (
  date: Date = new Date()
): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Tháng 1 -> tháng 7 vẫn thuộc năm học
  // bắt đầu từ năm trước
  if (month < 8) {
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
};
  // ==========================================================
  // ĐIỂM HẠNH KIỂM
  // ==========================================================

  const [conductScore, setConductScore] =
    useState<StudentConductScore | null>(null);

  const [maxConductScore, setMaxConductScore] =
    useState(100);

  // ==========================================================
  // NGÀY NHẬP LỖI
  // ==========================================================

  const [dayInput, setDayInput] = useState("");
  const [monthInput, setMonthInput] = useState("");

  // ==========================================================
  // DIALOG SỬA
  // ==========================================================

  const [editDialogOpen, setEditDialogOpen] =
    useState(false);

  const [editItem, setEditItem] =
    useState<Violation | null>(null);

  const [editDescription, setEditDescription] =
    useState("");

  const [editDate, setEditDate] =
    useState("");

  // ==========================================================
// 📷 DIALOG XEM CHI TIẾT VI PHẠM
// ==========================================================

const [detailDialogOpen, setDetailDialogOpen] =
  useState(false);

const [detailItem, setDetailItem] =
  useState<Violation | null>(null);

// ==========================================================
// 📷 THÊM HÌNH ẢNH
// ==========================================================

const [imageFiles, setImageFiles] = useState<File[]>([]);
const [uploadingImages, setUploadingImages] = useState(false);

const [detailImageUrls, setDetailImageUrls] = useState<Record<string, string>>({});
const [loadingDetailImages, setLoadingDetailImages] = useState(false);

const cameraInputRef = useRef<HTMLInputElement | null>(null);
const galleryInputRef = useRef<HTMLInputElement | null>(null);

const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // ==========================================================
  // LOAD DATA
  // ==========================================================

useEffect(() => {
  if (!name || !className) return;

const loadPage = async () => {
  await fetchRules();
  
  await fetchSettings();
  await fetchCurrentWeek();
  
  // Chờ state academicYear cập nhật rồi
  // useEffect bên dưới sẽ lấy ConductScore.
};
  loadPage();
}, [name, className]);
  
// ==========================================================
// LẤY VI PHẠM THEO TUẦN HIỆN TẠI
// ==========================================================

useEffect(() => {
  if (
    !name ||
    !className ||
    currentWeek === null
  ) {
    return;
  }

  fetchViolations();
}, [
  name,
  className,
  currentWeek,
]);


// ==========================================================
// LẤY CONDUCT SCORE
// ==========================================================

  useEffect(() => {
  if (
    !name ||
    !className ||
    !academicYear ||
    currentWeek === null
  ) {
    return;
  }

  fetchConductScore(
    currentWeek,
    academicYear
  );
}, [
  name,
  className,
  academicYear,
  currentWeek,
]);
  
  // ==========================================================
  // LẤY SETTINGS
  // ==========================================================

const fetchSettings = async () => {
  try {
    const res = await api.get(
      "/api/settings"
    );

    console.log(
      "SETTINGS:",
      res.data
    );

    if (
      res.data?.maxConductScore !==
      undefined
    ) {
      setMaxConductScore(
        Number(
          res.data.maxConductScore
        )
      );
    }

    // ==========================================
    // LẤY NĂM HỌC
    // ==========================================

    const settingAcademicYear =
      res.data?.academicYear;

    if (
      settingAcademicYear
    ) {
      setAcademicYear(
        String(settingAcademicYear)
      );
    } else {
      setAcademicYear(
        getCurrentAcademicYear()
      );
    }

  } catch (err) {
    console.error(
      "Lỗi khi lấy settings:",
      err
    );

    // Nếu không lấy được settings
    // vẫn xác định năm học từ ngày hiện tại
    setAcademicYear(
      getCurrentAcademicYear()
    );
  }
};

  // ==========================================================
  // LẤY VI PHẠM
  // ==========================================================

 const fetchViolations = async () => {
  try {
    // Chưa xác định tuần hiện tại thì chưa lấy dữ liệu
    if (
      !name ||
      !className ||
      currentWeek === null
    ) {
      return;
    }

    const res = await api.get(
      `/api/violations/${encodeURIComponent(
        name
      )}?className=${encodeURIComponent(
        className
      )}&weekNumber=${currentWeek}`
    );

    setViolations(res.data || []);

  } catch (err) {
    console.error(
      "Lỗi lấy vi phạm:",
      err
    );

    setViolations([]);
  }
};

  // ==========================================================
  // LẤY RULE
  // ==========================================================

  const fetchRules = async () => {
    try {
      const res =
        await api.get("/api/rules");

      setRules(res.data || []);
    } catch (err) {
      console.error(
        "Lỗi khi lấy rules:",
        err
      );
    }
  };

  // ==========================================================
  // LẤY TUẦN HIỆN TẠI
  // ==========================================================

 const fetchCurrentWeek = async () => {
  try {
    const res = await api.get(
      "/api/academic-weeks/study-weeks"
    );

    const weeks = res.data || [];

    const now = new Date();

    const currentWeekFound = weeks.find((w: any) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);

      return now >= start && now <= end;
    });

    if (!currentWeekFound) {
      console.warn(
        "Không tìm thấy tuần học hiện tại."
      );
      return;
    }

    const week = Number(
      currentWeekFound.weekNumber
    );    
    setCurrentWeek(week);    
  } catch (err) {
    console.error(
      "Lỗi khi lấy tuần hiện tại:",
      err
    );
  }
};

  // ==========================================================
  // LẤY ĐIỂM HẠNH KIỂM
  // ==========================================================

  const fetchConductScore = async (
  weekNumber: number,
  year: string
) => {
  if (
    !name ||
    !className ||
    !year
  ) {
    console.warn(
      "Thiếu dữ liệu lấy điểm HK:",
      {
        name,
        className,
        year,
        weekNumber,
      }
    );

    return;
  }

  try {
    console.log("📌 THAM SỐ LẤY HẠNH KIỂM:", {
  name,
  className,
  academicYear: year,
  weekNumber,
  });
    const res =
      await api.get(
        "/api/student-conduct-scores/student",
        {
          params: {
            name,
            className,
            academicYear: year,
            weekNumber,
          },
        }
      );

    console.log(
      "CONDUCT SCORE:",
      res.data
    );

    setConductScore(
      res.data || null
    );

  } catch (err) {
    console.error(
      "Lỗi khi lấy điểm hạnh kiểm:",
      err
    );

    setConductScore(null);
  }
};

  // ==========================================================
  // SAU KHI GHI / XÓA / SỬA → LOAD LẠI HK
  // ==========================================================

  const refreshConductScore = async () => {
  if (
    currentWeek !== null &&
    academicYear
  ) {
    await fetchConductScore(
      currentWeek,
      academicYear
    );
  }
};

  // ==========================================================
  // NGÀY VI PHẠM
  // ==========================================================

  const getViolationDate = (): Date => {
    const now = new Date();

    const year =
      now.getFullYear();

    if (
      dayInput &&
      monthInput
    ) {
      const dd =
        parseInt(
          dayInput,
          10
        );

      const mm =
        parseInt(
          monthInput,
          10
        ) - 1;

      if (
        !isNaN(dd) &&
        !isNaN(mm) &&
        dd > 0 &&
        dd <= 31 &&
        mm >= 0 &&
        mm < 12
      ) {
        const customDate =
          new Date(
            year,
            mm,
            dd,
            12,
            0,
            0,
            0
          );

        if (
          !isNaN(
            customDate.getTime()
          )
        ) {
          return customDate;
        }
      }
    }

    return new Date();
  };

  // ==========================================================
  // HIỂN THỊ NGÀY
  // ==========================================================

  const renderTime = (
    time?: string
  ) => {
    if (!time) return "N/A";

    const parsed =
      new Date(time);

    if (
      !isNaN(
        parsed.getTime()
      )
    ) {
      return parsed.toLocaleDateString(
        "vi-VN"
      );
    }

    return time;
  };

  // ==========================================================
  // TÌM RULE CỦA LỖI
  // ==========================================================

  const getRuleForViolation = (
    violation: Violation
  ) => {
    return rules.find(
      (r) =>
        r.title ===
        violation.description
    );
  };

  // ==========================================================
  // ➕ GHI NHẬN LỖI
  // ==========================================================

  const handleAddViolation = async () => {
  const selectedRule =
    rules.find(
      (r) =>
        r._id === selectedRuleId
    );

  if (
    !selectedRule ||
    !name ||
    !className
  ) {
    setSnackbarMessage(
      "Vui lòng chọn lỗi vi phạm và đảm bảo có tên/lớp."
    );

    setSnackbarSeverity("error");
    setSnackbarOpen(true);

    return;
  }

  try {
    const weeksRes =
      await api.get(
        "/api/academic-weeks/study-weeks"
      );

    const weeks =
      weeksRes.data || [];

    const now = new Date();

    const currentWeekFound =
      weeks.find(
        (w: any) => {
          const start =
            new Date(
              w.startDate
            );

          const end =
            new Date(
              w.endDate
            );

          return (
            now >= start &&
            now <= end
          );
        }
      );

    if (!currentWeekFound) {
      setSnackbarMessage(
        "Không xác định được tuần học hiện tại."
      );

      setSnackbarSeverity("error");
      setSnackbarOpen(true);

      return;
    }

    const weekNumber =
      Number(
        currentWeekFound.weekNumber
      );

    const year =
      academicYear ||
      getCurrentAcademicYear();

    if (!year) {
      setSnackbarMessage(
        "Không xác định được năm học."
      );

      setSnackbarSeverity("error");
      setSnackbarOpen(true);

      return;
    }

    const violationDate =
      getViolationDate();

    console.log(
      "POST VIOLATION:",
      {
        name,
        className,
        description:
          selectedRule.title,
        ruleCode:
          selectedRule.ruleCode,
        groupCode:
          selectedRule.groupCode,
        academicYear: year,
        weekNumber,
      }
    );

    await api.post(
      "/api/violations",
      {
        name,
        className,

        description:
          selectedRule.title,

        ruleCode:
          selectedRule.ruleCode,

        groupCode:
          selectedRule.groupCode,

        handlingMethod: "",

        academicYear: year,

        weekNumber,

        time:
          violationDate.toISOString(),

        handled: false,

        handledBy: "",
      }
    );

    setSelectedRuleId("");
    setDayInput("");
    setMonthInput("");

    setSnackbarMessage(
      `Đã ghi nhận lỗi: ${selectedRule.title}`
    );

    setSnackbarSeverity(
      "success"
    );

    setSnackbarOpen(true);

    await fetchViolations();

    await fetchConductScore(
      weekNumber,
      year
    );

  } catch (err) {
    console.error(
      "Lỗi khi ghi nhận vi phạm:",
      err
    );

    setSnackbarMessage(
      "Lỗi khi ghi nhận vi phạm."
    );

    setSnackbarSeverity(
      "error"
    );

    setSnackbarOpen(true);
  }
};

  // ==========================================================
  // ❌ XÓA VI PHẠM
  // ==========================================================

  const handleDeleteViolation =
    async (id: string) => {
      try {
        await api.delete(
          `/api/violations/${id}`
        );

        setSnackbarMessage(
          "Xoá vi phạm thành công!"
        );

        setSnackbarSeverity(
          "success"
        );

        setSnackbarOpen(true);

        await fetchViolations();

        await refreshConductScore();
      } catch (err) {
        console.error(
          "Lỗi xoá vi phạm:",
          err
        );

        setSnackbarMessage(
          "Lỗi xoá vi phạm."
        );

        setSnackbarSeverity(
          "error"
        );

        setSnackbarOpen(true);
      }
    };
// ==========================================================
// 👁️ MỚI BỔ SUNG
// ==========================================================
const loadDetailImages = async (violation: Violation) => {
  if (!violation.images || violation.images.length === 0) {
    setDetailImageUrls({});
    return;
  }

  try {
    setLoadingDetailImages(true);

    const imageEntries = await Promise.all(
      violation.images.map(async (image) => {
        try {
          const response = await api.get(
            image.url,
            {
              responseType: "blob",
            }
          );

          const objectUrl = URL.createObjectURL(response.data);

          return {
            fileId: image.fileId,
            url: objectUrl,
          };
        } catch (error) {
          console.error(
            "❌ Không thể tải hình ảnh:",
            image.fileId,
            error
          );

          return null;
        }
      })
    );

    const imageMap: Record<string, string> = {};

    imageEntries.forEach((item) => {
      if (item) {
        imageMap[item.fileId] = item.url;
      }
    });

    setDetailImageUrls(imageMap);

  } catch (error) {
    console.error("❌ loadDetailImages:", error);
    setSnackbarMessage("Không thể tải hình ảnh.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  } finally {
    setLoadingDetailImages(false);
  }
};
  
// ==========================================================
// 👁️ MỞ DIALOG XEM CHI TIẾT VI PHẠM
// ==========================================================

const openDetailDialog = async (v: Violation) => {
  setDetailItem(v);
  setImageFiles([]);
  setImagePreviews([]);
  setDetailImageUrls({});
  setDetailDialogOpen(true);

  await loadDetailImages(v);
};
// ==========================================================
// 📷 GIẢM DUNG LƯỢNG HÌNH ẢNH
// ==========================================================

  const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxSize = 1280;

      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Không thể xử lý hình ảnh."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Không thể nén hình ảnh."));
            return;
          }

          const fileName =
            file.name.replace(/\.[^/.]+$/, "") + ".jpg";

          const compressedFile = new File(
            [blob],
            fileName,
            {
              type: "image/jpeg",
              lastModified: Date.now(),
            }
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc hình ảnh."));
    };

    img.src = objectUrl;
  });
};
  
// ==========================================================
// 📷 CHỌN HÌNH ẢNH
// ==========================================================

const handleSelectImages = async (
  event: ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(event.target.files || []);

  // Cho phép chọn lại đúng file vừa chọn trước đó
  event.target.value = "";

  if (files.length === 0) return;

  try {
    // Tổng số ảnh đang chờ upload + ảnh mới không được quá 5
    if (imageFiles.length + files.length > 5) {
      setSnackbarMessage(
        `Tối đa 5 hình ảnh. Hiện đã có ${imageFiles.length} hình.`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      setSnackbarMessage("Không có hình ảnh hợp lệ.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Nén ảnh ngay sau khi chụp/chọn
    const compressedFiles = await Promise.all(
      validFiles.map((file) => compressImage(file))
    );

    // THÊM vào danh sách cũ, không ghi đè
    setImageFiles((prev) => [
      ...prev,
      ...compressedFiles,
    ]);

    const previewUrls = compressedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    // THÊM preview mới vào preview cũ
    setImagePreviews((prev) => [
      ...prev,
      ...previewUrls,
    ]);

  } catch (error) {
    console.error("❌ Lỗi nén hình ảnh:", error);

    setSnackbarMessage("Không thể xử lý hình ảnh.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
};

// ==========================================================
// 📤 UPLOAD HÌNH ẢNH
// ==========================================================

const handleUploadImages = async () => {
  if (!detailItem) {
    return;
  }

  if (imageFiles.length === 0) {
    setSnackbarMessage(
      "Vui lòng chọn hình ảnh."
    );

    setSnackbarSeverity("error");
    setSnackbarOpen(true);

    return;
  }

  const currentImageCount =
    detailItem.images?.length || 0;

  if (
    currentImageCount +
      imageFiles.length >
    20
  ) {
    setSnackbarMessage(
      `Vi phạm này đã có ${currentImageCount} ảnh. Tối đa 20 ảnh.`
    );

    setSnackbarSeverity("error");
    setSnackbarOpen(true);

    return;
  }

  try {
    setUploadingImages(true);

const formData = new FormData();

imageFiles.forEach((file) => {
  formData.append("images", file);
});
    console.log(
  "📤 UPLOAD IMAGE URL:",
  `/api/violations/${detailItem._id}/images`
);
console.log("📤 VIOLATION ID:", detailItem._id);
console.log("📤 FILES:", imageFiles);
    const res = await api.post(
      `/api/violations/${detailItem._id}/images`,
      formData
    );

    const updatedImages = res.data?.images || [];

const updatedItem = {
  ...detailItem,
  images: updatedImages,
};

setDetailItem(updatedItem);

setViolations(prev =>
  prev.map(v =>
    v._id === detailItem._id
      ? { ...v, images: updatedImages }
      : v
  )
);

// Tải lại toàn bộ ảnh để ảnh vừa upload hiển thị ngay
await loadDetailImages(updatedItem);

imagePreviews.forEach((url) => {
  URL.revokeObjectURL(url);
});

setImageFiles([]);
setImagePreviews([]);

    setSnackbarMessage(
      "Đã thêm hình ảnh thành công."
    );

    setSnackbarSeverity(
      "success"
    );

    setSnackbarOpen(true);

  } catch (err) {
    console.error(
      "Lỗi upload hình ảnh:",
      err
    );

    setSnackbarMessage(
      "Không thể upload hình ảnh."
    );

    setSnackbarSeverity(
      "error"
    );

    setSnackbarOpen(true);

  } finally {
    setUploadingImages(false);
  }
};
  // ==========================================================
// 📤 DELETE HÌNH ẢNH
// ==========================================================
  const handleDeleteImage = async (fileId: string) => {
  if (!detailItem) return;

  const confirmed = window.confirm(
    "Bạn có chắc muốn xóa hình ảnh này không?"
  );

  if (!confirmed) return;

  try {
    await api.delete(
      `/api/violations/${detailItem._id}/images/${fileId}`
    );

    // Giải phóng URL ảnh tạm
    if (detailImageUrls[fileId]) {
      URL.revokeObjectURL(detailImageUrls[fileId]);
    }

    // Xóa khỏi danh sách URL đang hiển thị
    setDetailImageUrls((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

    // Xóa khỏi detailItem
    const updatedImages = (detailItem.images || []).filter(
      (image) => image.fileId !== fileId
    );

    const updatedItem = {
      ...detailItem,
      images: updatedImages,
    };

    setDetailItem(updatedItem);

    // Cập nhật luôn danh sách ngoài bảng
    setViolations((prev) =>
      prev.map((v) =>
        v._id === detailItem._id
          ? { ...v, images: updatedImages }
          : v
      )
    );

    setSnackbarMessage("Đã xóa hình ảnh.");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);

  } catch (error) {
    console.error("❌ Lỗi xóa hình ảnh:", error);

    setSnackbarMessage("Không thể xóa hình ảnh.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
};
  // ==========================================================
  // ✏️ MỞ DIALOG SỬA
  // ==========================================================

  const openEditDialog = (
    v: Violation
  ) => {
    setEditItem(v);

    setEditDescription(
      v.description
    );

    setEditDate(
      renderTime(v.time)
    );

    setEditDialogOpen(
      true
    );
  };

  // ==========================================================
  // 💾 LƯU SỬA
  // ==========================================================

  const handleSaveEdit =
    async () => {
      if (!editItem) return;

      try {
        const parsedDate =
          dayjs(
            editDate,
            "DD/MM/YYYY"
          );

        const formattedDate =
          parsedDate.isValid()
            ? parsedDate.toDate()
            : new Date();

        await api.put(
          `/api/violations/${editItem._id}`,
          {
            description:
              editDescription,

            time:
              formattedDate,
          }
        );

        setSnackbarMessage(
          "Đã cập nhật lỗi vi phạm!"
        );

        setSnackbarSeverity(
          "success"
        );

        setSnackbarOpen(true);

        setEditDialogOpen(
          false
        );

        await fetchViolations();

        await refreshConductScore();
      } catch (err) {
        console.error(
          "Lỗi khi cập nhật vi phạm:",
          err
        );

        setSnackbarMessage(
          "Không thể cập nhật vi phạm."
        );

        setSnackbarSeverity(
          "error"
        );

        setSnackbarOpen(true);
      }
    };

  // ==========================================================
  // ĐIỂM HIỆN TẠI
  // ==========================================================

const currentScore =
  conductScore?.finalScore ??
  maxConductScore;

const seriousViolation =
  conductScore?.hasSeriousViolation ??
  false;

const groupViolations =
  conductScore?.groupViolations ?? {
    N1: 0,
    N2: 0,
    N3: 0,
    N4: 0,
    N5: 0,
    S1: 0,
  };

const totalConductViolations =
  conductScore?.totalConductViolations ??
  (
    groupViolations.N1 +
    groupViolations.N2 +
    groupViolations.N3 +
    groupViolations.N4 +
    groupViolations.N5
  );

  const isBelowThreshold =
    currentScore <
    maxConductScore * 0.5;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        width: "80vw",
        maxWidth: 1500,
        py: 5,
        mx: "auto",
      }}
    >
      {/* ======================================================
          TIÊU ĐỀ
      ====================================================== */}

      <Typography
        variant="h4"
        fontWeight="bold"
        align="center"
        mb={1}
      >
        Chi tiết vi phạm
      </Typography>

      <Typography
        variant="h6"
        align="center"
        mb={3}
      >
        Học sinh:{" "}
        <strong>{name}</strong>
        {" - "}
        Lớp:{" "}
        <strong>{className}</strong>
      </Typography>

      {/* ======================================================
          THÔNG TIN HẠNH KIỂM
      ====================================================== */}

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        <CardContent>
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={3}
            alignItems={{
              xs: "stretch",
              md: "center",
            }}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="subtitle1"
                color="text.secondary"
              >
                Hạnh kiểm tuần{" "}
                {currentWeek ??
                  "—"}
              </Typography>

              <Typography
                variant="h3"
                fontWeight="bold"
                color={
                  isBelowThreshold
                    ? "error.main"
                    : "success.main"
                }
              >
                {currentScore}
                <Typography
                  component="span"
                  variant="h6"
                  color="text.secondary"
                >
                  {" "}
                  /{" "}
                  {maxConductScore}
                </Typography>
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
            >
              <Chip
                label={`Tổng lỗi HK: ${totalConductViolations}`}
                color={
                  totalConductViolations >
                  0
                    ? "warning"
                    : "success"
                }
              />

              {seriousViolation && (
                <Chip
                  label="⚠ Lỗi đặc biệt nghiêm trọng"
                  color="error"
                  sx={{
                    fontWeight:
                      "bold",
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="body2"
            color="text.secondary"
            mb={1}
          >
            Chi tiết số lần bị trừ điểm
            hạnh kiểm trong tuần:
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
          >
            <Chip
              size="small"
              label={`N1: ${
  groupViolations.N1
} lần`}
            />

            <Chip
              size="small"
              label={`N2: ${
                conductScore?.groupViolations?.N2 ?? 0
              } lần`}
            />

            <Chip
              size="small"
              label={`N3: ${
  groupViolations.N3
} lần`}
            />

            <Chip
              size="small"
              label={`N4: ${
  groupViolations.N4
} lần`}
            />

            <Chip
              size="small"
              label={`N5: ${
  groupViolations.N5
} lần`}
            />
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={2}
          >
            Mỗi lỗi thuộc nhóm N1–N5 bị
            trừ 1 điểm hạnh kiểm. Điểm
            `point` của nội quy không dùng
            để tính điểm hạnh kiểm.
          </Typography>
        </CardContent>
      </Card>

      {/* ======================================================
          GHI NHẬN LỖI
      ====================================================== */}

      <Card
        sx={{
          my: 3,
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            fontWeight="bold"
          >
            Ghi nhận lỗi mới
          </Typography>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
            mt={2}
            alignItems="center"
          >
            <FormControl fullWidth>
              <InputLabel>
                Lỗi vi phạm
              </InputLabel>

              <Select
                value={
                  selectedRuleId
                }
                label="Lỗi vi phạm"
                onChange={(e) =>
                  setSelectedRuleId(
                    e.target.value
                  )
                }
              >
                {rules
                  .filter(
                    (rule) =>
                      rule.active !==
                      false
                  )
                  .map((rule) => (
                    <MenuItem
                      key={
                        rule._id
                      }
                      value={
                        rule._id
                      }
                    >
                      {rule.title}

                      {rule.groupCode && (
                        <>
                          {" "}
                          —{" "}
                          {rule.groupCode}
                        </>
                      )}

                      {" "}
                      (
                      {rule.point}
                      {" "}
                      điểm lớp)
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label="Ngày"
              value={dayInput}
              onChange={(e) =>
                setDayInput(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              inputProps={{
                maxLength: 2,
              }}
              sx={{
                width: {
                  xs: "100%",
                  sm: 100,
                },
              }}
            />

            <TextField
              label="Tháng"
              value={monthInput}
              onChange={(e) =>
                setMonthInput(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              inputProps={{
                maxLength: 2,
              }}
              sx={{
                width: {
                  xs: "100%",
                  sm: 110,
                },
              }}
            />

            <Button
              variant="contained"
              onClick={
                handleAddViolation
              }
              sx={{
                minWidth: 110,
              }}
            >
              Ghi nhận
            </Button>
          </Stack>

          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() =>
              navigate(
                "/violation/"
              )
            }
          >
            Nhập tên học sinh mới
          </Button>
        </CardContent>
      </Card>

      {/* ======================================================
          DANH SÁCH VI PHẠM
      ====================================================== */}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          overflowX: "auto",
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor:
                  "#87cafe",
              }}
            >
              <TableCell>
                <strong>
                  STT
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Lỗi vi phạm
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Nhóm
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Thời gian
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Hình thức xử lý
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Trạng thái
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Điểm lớp
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  HK
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Tuần
                </strong>
              </TableCell>

              <TableCell>
                <strong>
                  Thao tác
                </strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {violations.map(
              (v, idx) => {
                const matchedRule =
                  getRuleForViolation(
                    v
                  );

                const groupCode =
                  matchedRule?.groupCode?.toUpperCase();

                const affectsConduct =
                  [
                    "N1",
                    "N2",
                    "N3",
                    "N4",
                    "N5",
                  ].includes(
                    groupCode || ""
                  );

                const isSerious =
                  groupCode ===
                  "S1";

                return (
                  <TableRow
                    key={v._id}
                  >
                    <TableCell>
                      {idx + 1}
                    </TableCell>

                    <TableCell>
                      <Typography
                        fontWeight={
                          isSerious
                            ? "bold"
                            : "normal"
                        }
                        color={
                          isSerious
                            ? "error"
                            : "inherit"
                        }
                      >
                        {v.description}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {groupCode ? (
                        <Chip
                          size="small"
                          label={
                            groupCode
                          }
                          color={
                            isSerious
                              ? "error"
                              : affectsConduct
                              ? "warning"
                              : "default"
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      {renderTime(
                        v.time
                      )}
                    </TableCell>

                    <TableCell>
                      {v.handlingMethod ||
                        "—"}
                    </TableCell>

                    <TableCell>
                      {v.handled ? (
                        <Box
                          sx={{
                            backgroundColor:
                              "green",
                            color:
                              "white",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            textAlign:
                              "center",
                          }}
                        >
                          Đã xử lý
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            backgroundColor:
                              "#ffcccc",
                            color:
                              "red",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            textAlign:
                              "center",
                          }}
                        >
                          Chưa xử lý
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      {matchedRule?.point ??
                        0}
                    </TableCell>

                    <TableCell>
                      {affectsConduct ? (
                        <Chip
                          size="small"
                          label="-1 HK"
                          color="warning"
                        />
                      ) : isSerious ? (
                        <Chip
                          size="small"
                          label="Không trừ"
                          color="error"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Không trừ"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      {v.weekNumber ??
                        "N/A"}
                    </TableCell>

                    <TableCell>
  <Stack
    direction="row"
    spacing={0.5}
    alignItems="center"
    sx={{
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
    }}
  >
    <Button
      size="small"
      variant="outlined"
      onClick={() => openDetailDialog(v)}
      sx={{
        minWidth: 90,
        height: 32,
      }}
    >
      Xem chi tiết
    </Button>

    <Button
      size="small"
      variant="outlined"
      onClick={() => openDetailDialog(v)}
      sx={{
        minWidth: 80,
        height: 32,
      }}
    >
      Thêm hình
    </Button>

    <Button
      size="small"
      variant="outlined"
      onClick={() => openEditDialog(v)}
      sx={{
        minWidth: 55,
        height: 32,
      }}
    >
      Sửa
    </Button>

    <Button
      size="small"
      variant="outlined"
      color="error"
      onClick={() => handleDeleteViolation(v._id)}
      sx={{
        minWidth: 55,
        height: 32,
      }}
    >
      Xóa
    </Button>
  </Stack>
</TableCell>
                    
                  </TableRow>
                );
              }
            )}

            {violations.length ===
              0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  align="center"
                >
                  Chưa có vi phạm
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ======================================================
          DIALOG SỬA
      ====================================================== */}

      <Dialog
        open={editDialogOpen}
        onClose={() =>
          setEditDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Sửa lỗi vi phạm
        </DialogTitle>

        <DialogContent>
          <FormControl
            fullWidth
            sx={{ mt: 2 }}
          >
            <InputLabel>
              Lỗi vi phạm
            </InputLabel>

            <Select
              value={
                editDescription
              }
              label="Lỗi vi phạm"
              onChange={(e) =>
                setEditDescription(
                  e.target.value
                )
              }
            >
              {rules
                .filter(
                  (rule) =>
                    rule.active !==
                    false
                )
                .map((rule) => (
                  <MenuItem
                    key={
                      rule._id
                    }
                    value={
                      rule.title
                    }
                  >
                    {rule.title}

                    {rule.groupCode &&
                      ` — ${rule.groupCode}`}

                    {" "}
                    (
                    {rule.point}
                    {" "}
                    điểm lớp)
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Ngày vi phạm (dd/mm/yyyy)"
            value={editDate}
            onChange={(e) =>
              setEditDate(
                e.target.value
              )
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setEditDialogOpen(
                false
              )
            }
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSaveEdit
            }
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================
    DETAIL DIALOG
========================= */}
<Dialog
  open={detailDialogOpen}
  onClose={() => {
    imagePreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setImagePreviews([]);
    setImageFiles([]);
    setDetailDialogOpen(false);
  }}
  fullWidth
  maxWidth="md"
>
  <DialogTitle>
    Chi tiết vi phạm
  </DialogTitle>

  <DialogContent dividers>
    {detailItem && (
      <Stack spacing={2}>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Học sinh
          </Typography>
          <Typography fontWeight={600}>
            {name}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Lớp
          </Typography>
          <Typography fontWeight={600}>
            {className}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Nội dung vi phạm
          </Typography>
          <Typography fontWeight={600}>
            {detailItem.description}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Nhóm
          </Typography>
          <Typography>
            {detailItem.groupCode}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Thời gian
          </Typography>
          <Typography>
            {dayjs(detailItem.time).format("DD/MM/YYYY HH:mm")}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Hình thức xử lý
          </Typography>
          <Typography>
            {detailItem.handlingMethod || "Chưa có"}
          </Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6" gutterBottom>
            Hình ảnh vi phạm
          </Typography>

          {(!detailItem.images || detailItem.images.length === 0) ? (
            <Typography color="text.secondary">
              Chưa có hình ảnh.
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {detailItem.images.map((image) => (
                <Box
                  key={image.fileId}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >

                  {loadingDetailImages ? (
  <Box
    sx={{
      height: 220,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Typography color="text.secondary">
      Đang tải hình ảnh...
    </Typography>
  </Box>
) : detailImageUrls[image.fileId] ? (
  <>
    <img
      src={detailImageUrls[image.fileId]}
      alt="Hình ảnh vi phạm"
      style={{
        width: "100%",
        height: 220,
        objectFit: "cover",
        display: "block",
      }}
    />

    <Box sx={{ p: 1 }}>
      <Button
        fullWidth
        size="small"
        color="error"
        variant="outlined"
        onClick={() =>
          handleDeleteImage(image.fileId)
        }
      >
        Xóa hình
      </Button>
    </Box>
  </>
) : (
  <Box
    sx={{
      height: 220,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Typography color="text.secondary">
      Không thể tải hình ảnh
    </Typography>
  </Box>
)}
                  
                  
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider />
      {/* ======================================================
          Thêm ảnh
      ====================================================== */}
       <Box>
  <Typography variant="h6" gutterBottom>
    Thêm hình ảnh
  </Typography>

  {/* Camera */}
  <input
    ref={cameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    style={{ display: "none" }}
    onChange={handleSelectImages}
  />

  {/* Thư viện ảnh */}
  <input
    ref={galleryInputRef}
    type="file"
    accept="image/*"
    multiple
    style={{ display: "none" }}
    onChange={handleSelectImages}
  />

  <Stack
    direction="row"
    spacing={1}
    sx={{
      flexWrap: "wrap",
      gap: 1,
    }}
  >
    <Button
      variant="outlined"
      onClick={() => cameraInputRef.current?.click()}
    >
      📷 Chụp ảnh
    </Button>

    <Button
      variant="outlined"
      onClick={() => galleryInputRef.current?.click()}
    >
      🖼️ Chọn ảnh
    </Button>
  </Stack>

  {imageFiles.length > 0 && (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 1 }}
    >
      Đã chọn {imageFiles.length} hình ảnh
    </Typography>
  )}

  <Button
    variant="contained"
    sx={{ mt: 2 }}
    onClick={handleUploadImages}
    disabled={
      uploadingImages ||
      imageFiles.length === 0
    }
  >
    {uploadingImages
      ? "Đang tải lên..."
      : "Tải hình lên"}
  </Button>
         {imagePreviews.length > 0 && (
  <Stack
    direction="row"
    spacing={1}
    sx={{
      mt: 2,
      flexWrap: "wrap",
      gap: 1,
    }}
  >
    {imagePreviews.map((url, index) => (
      <Box
        key={url}
        sx={{
          position: "relative",
          width: 100,
          height: 100,
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <img
          src={url}
          alt={`Ảnh ${index + 1}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        <Button
          size="small"
          color="error"
          variant="contained"
          onClick={() => {
            URL.revokeObjectURL(url);

            setImagePreviews((prev) =>
              prev.filter((_, i) => i !== index)
            );

            setImageFiles((prev) =>
              prev.filter((_, i) => i !== index)
            );
          }}
          sx={{
            position: "absolute",
            right: 2,
            top: 2,
            minWidth: 28,
            width: 28,
            height: 28,
            p: 0,
            fontSize: 16,
          }}
        >
          ×
        </Button>
      </Box>
    ))}
  </Stack>
)}
</Box>

      </Stack>
    )}
  </DialogContent>

  <DialogActions>
  <Button
    onClick={() => {
      imagePreviews.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      setImagePreviews([]);
      setImageFiles([]);
      setDetailDialogOpen(false);
    }}
  >
    Đóng
  </Button>
</DialogActions>
</Dialog>
      
      
      {/* ======================================================
          SNACKBAR
      ====================================================== */}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbarOpen(false)
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={() =>
            setSnackbarOpen(false)
          }
          severity={
            snackbarSeverity
          }
          sx={{
            width: "100%",
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ViolationDetailPage;
