// src/pages/violation/RecordClassLineUpSummaryPage.tsx
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  Select,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../api/api";
import dayjs from "dayjs";
import heic2any from "heic2any";
interface StudentSuggestion {
  _id: string;
  name: string;
  className?: string;
}

interface LineUpRecord {
  _id: string;
  className: string;
  studentName?: string;
  violation: string;
  date: string;
  recorder?: string;
  scoreChange?: number;
  note?: string;
  images?: {
    fileId: string;
    url: string;
  }[];
}

interface AcademicWeek {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function RecordClassLineUpSummaryPage() {
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [violation, setViolation] = useState("");
  const [studentInput, setStudentInput] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [recorder] = useState("Th.Huy"); // tạm thời mặc định
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [records, setRecords] = useState<LineUpRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 📷 Hình ảnh vi phạm xếp hàng
  const [detailItem, setDetailItem] = useState<LineUpRecord | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // 📷 Ảnh của lỗi mới - chụp trước khi lưu
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  
  const [detailImageUrls, setDetailImageUrls] = useState<{ [fileId: string]: string }>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loadingDetailImages, setLoadingDetailImages] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [processingImages, setProcessingImages] = useState(false);
  
  // tuần
  const [weeks, setWeeks] = useState<AcademicWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | "">("");
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);

  // 3 lỗi cố định
  const violationOptions = [
    'Tập trung xếp hàng quá thời gian quy định',
    'Mất trật tự, đùa giỡn khi xếp hàng',
    'Mất trật tự khi di chuyển, di chuyện lộn xộn không theo hàng lối',
    'Không dọn vệ sinh vị trí xếp hàng',
    'Nhiều học sinh ngồi trong lớp giờ chơi, giờ xếp hàng',
    'Mất trật tự trong khi xếp hàng giờ SHDC',
    'Rượt đuổi nhau gây mất trật tự',
    'Không tắt đèn, quạt giờ chơi',
    'Không đóng cửa lớp giờ chơi, giờ thể dục, TH thực hành',
  ];

  // --- Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get("/api/classes");
        const arr = (res.data || []).map((c: any) => c.className ?? c.name ?? String(c));
        setClasses(arr);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp:", err);
      }
    };
    loadClasses();
  }, []);

  // --- Load tuần học + tuần hiện tại
  const loadWeeks = async () => {
    try {
      const res = await api.get("/api/academic-weeks/study-weeks");
      setWeeks(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách tuần:", err);
      setWeeks([]);
    }

    try {
      const cur = await api.get("/api/academic-weeks/current");
      const wk = cur.data?.weekNumber ?? null;
      setCurrentWeek(wk);
      setSelectedWeek(wk ?? "");
      // gọi loadRecords với tuần hiện tại (nếu có)
      await loadRecords(wk ?? undefined);
    } catch (err) {
      console.error("Lỗi khi tải tuần hiện tại:", err);
      setCurrentWeek(null);
      setSelectedWeek("");
      await loadRecords(undefined); // load mặc định (backend xử lý tuần hiện tại nếu không có param)
    }
  };

  // --- Load records theo tuần (hỗ trợ response: array hoặc { records: [] })
  const loadRecords = async (weekNumber?: number) => {
    setLoading(true);
    try {
      const params: any = {};
      if (weekNumber) params.weekNumber = weekNumber;
      // nếu backend trả 404 cho endpoint mặc định, log rõ
      const res = await api.get("/api/class-lineup-summaries/weekly", { params });
      // backend có thể trả { weekNumber, startDate, endDate, records } hoặc trả mảng
      let data = res.data;
      if (data && Array.isArray(data)) {
        setRecords(data);
      } else if (data && Array.isArray(data.records)) {
        setRecords(data.records);
      } else {
        // có thể backend trả object rỗng hoặc lỗi định dạng
        setRecords([]);
      }
      console.log("loadRecords response:", res.data);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách vi phạm:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWeekChange = (e: any) => {
    const value = e.target.value;
    setSelectedWeek(value);
    loadRecords(value || undefined);
  };

  // --- Gợi ý học sinh
  useEffect(() => {
    if (!studentInput.trim() || !className) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/students/search", {
          params: { name: studentInput.trim(), className },
        });
        setSuggestions(res.data || []);
      } catch (err) {
        console.error("Lỗi tìm học sinh:", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [studentInput, className]);

  // --- Chọn học sinh
  const handleSelectSuggestion = (s: StudentSuggestion) => {
    if (!selectedStudents.includes(s.name)) setSelectedStudents((p) => [...p, s.name]);
    setStudentInput("");
    setSuggestions([]);
  };

  const removeSelectedStudent = (name: string) => {
    setSelectedStudents((p) => p.filter((x) => x !== name));
  };

  // --- Lưu ghi nhận
  const handleSave = async () => {
  if (!className) return alert("Vui lòng chọn lớp.");
  if (!violation) return alert("Vui lòng chọn loại vi phạm.");

  try {
    setLoading(true);

    const now = new Date();
    const timePart = now.toTimeString().split(" ")[0];
    const isoDatetime = new Date(`${date}T${timePart}`).toISOString();

    const payload = {
      className,
      violation,
      studentName: selectedStudents.join(", "),
      recorder,
      date: isoDatetime,
      note,
    };

    // ==========================================================
    // 1. LƯU GHI NHẬN
    // ==========================================================
    const res = await api.post(
      "/api/class-lineup-summaries",
      payload
    );

    const createdRecord =
      res.data?.record || res.data;

    const recordId = createdRecord?._id;

    if (!recordId) {
      throw new Error("Không lấy được ID bản ghi vừa tạo.");
    }

    // ==========================================================
    // 2. NẾU CÓ ẢNH → UPLOAD NGAY VÀO BẢN GHI VỪA TẠO
    // ==========================================================
    if (imageFiles.length > 0) {
      const formData = new FormData();

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      await api.post(
        `/api/class-lineup-summaries/${recordId}/images`,
        formData
      );
    }

    // ==========================================================
    // 3. DỌN FORM
    // ==========================================================
    imagePreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setViolation("");
    setStudentInput("");
    setSelectedStudents([]);
    setNote("");
    setImageFiles([]);
    setImagePreviews([]);

    // ==========================================================
    // 4. TẢI LẠI DANH SÁCH
    // ==========================================================
    await loadRecords(selectedWeek || undefined);

    alert(
      imageFiles.length > 0
        ? "Đã lưu ghi nhận và hình ảnh thành công."
        : "Đã lưu ghi nhận thành công."
    );
  } catch (err: any) {
    console.error("Lỗi khi lưu ghi nhận:", err);

    alert(
      err?.response?.data?.message ||
        err?.message ||
        "Lưu ghi nhận thất bại."
    );
  } finally {
    setLoading(false);
  }
};

  // ============================================================
  // 📷 HÌNH ẢNH VI PHẠM XẾP HÀNG
  // ============================================================

  const loadDetailImages = async (record: LineUpRecord) => {
    if (!record.images || record.images.length === 0) {
      setDetailImageUrls({});
      return;
    }

    setLoadingDetailImages(true);

    try {
      const urls: { [fileId: string]: string } = {};

      for (const image of record.images) {
        try {
          const res = await api.get(image.url, {
            responseType: "blob",
          });

          urls[image.fileId] = URL.createObjectURL(res.data);
        } catch (err) {
          console.error("Lỗi tải hình ảnh:", image.fileId, err);
        }
      }

      setDetailImageUrls(urls);
    } finally {
      setLoadingDetailImages(false);
    }
  };

  const openDetailDialog = (record: LineUpRecord) => {
    // Giải phóng preview cũ
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));

    // Giải phóng ảnh detail cũ
    Object.values(detailImageUrls).forEach((url) => URL.revokeObjectURL(url));

    setDetailItem(record);
    setImageFiles([]);
    setImagePreviews([]);
    setDetailImageUrls({});

    loadDetailImages(record);
  };

  const closeDetailDialog = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    Object.values(detailImageUrls).forEach((url) => URL.revokeObjectURL(url));

    setDetailItem(null);
    setImageFiles([]);
    setImagePreviews([]);
    setDetailImageUrls({});
  };

//=========================================================

  const compressImage = async (file: File): Promise<File> => {
  let inputFile = file;

  // ==========================================================
  // 📷 HEIC / HEIF → JPEG
  // ==========================================================
  const isHEIC =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  if (isHEIC) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.65,
      });

      const convertedBlob = Array.isArray(converted)
        ? converted[0]
        : converted;

      inputFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        }
      );
    } catch (error) {
      console.error("❌ Lỗi chuyển HEIC sang JPEG:", error);
      throw new Error("Không thể chuyển ảnh HEIC sang JPEG");
    }
  }

  // ==========================================================
  // 📷 Resize + nén
  // ==========================================================
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Giảm từ 1280 xuống 1024 để xử lý nhanh hơn trên điện thoại
        const maxSize = 1024;

        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width >= height) {
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
          reject(new Error("Không thể tạo canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Không thể nén hình ảnh"));
              return;
            }

            const compressedName =
              inputFile.name.replace(/\.[^/.]+$/, "") + ".jpg";

            resolve(
              new File([blob], compressedName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          0.65
        );
      };

      img.onerror = () => {
        reject(new Error("Không thể đọc hình ảnh sau khi chuyển đổi"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Không thể đọc file"));
    };

    reader.readAsDataURL(inputFile);
  });
};
  
//=========================================================
  const handleSelectImages = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    alert(
  `ĐÃ NHẬN ẢNH\nTên: ${files[0]?.name}\nLoại: ${files[0]?.type || "không xác định"}`
);
    // Cho phép chọn lại cùng một file ở lần sau
    event.target.value = "";

    if (files.length === 0) return;

    const currentCount = newImageFiles.length;
    const maxNewImages = Math.max(0, 5 - currentCount);

    if (maxNewImages <= 0) {
      alert("Mỗi lần chỉ được chọn tối đa 5 hình ảnh.");
      return;
    }

    const selected = files.slice(0, maxNewImages);

    if (files.length > maxNewImages) {
      alert(`Chỉ nhận tối đa ${maxNewImages} hình ảnh mới.`);
    }

    const validFiles = selected.filter((file) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name);
  
    if (!isImage) {
      alert(`"${file.name}" không phải là hình ảnh.`);
      return false;
    }
  
    if (file.size > 10 * 1024 * 1024) {
      alert(`"${file.name}" vượt quá 10MB.`);
      return false;
    }
  
    return true;
  });

    if (validFiles.length === 0) return;

    try {
  setProcessingImages(true);

  const compressedFiles = await Promise.all(
    validFiles.map((file) => compressImage(file))
  );
      alert(
  `ĐÃ CHUYỂN ẢNH THÀNH CÔNG\nSố ảnh: ${compressedFiles.length}\nTên: ${compressedFiles[0]?.name}\nLoại: ${compressedFiles[0]?.type}`
);
      const previews = compressedFiles.map((file) =>
        URL.createObjectURL(file)
      );

setNewImageFiles((prev) => [...prev, ...compressedFiles]);
setNewImagePreviews((prev) => [...prev, ...previews]);
    } catch (err: any) {
  console.error("❌ Lỗi xử lý hình ảnh:", err);

  const fileInfo = files
    .map(
      (f) =>
        `Tên: ${f.name}\n` +
        `Loại: ${f.type || "không xác định"}\n` +
        `Dung lượng: ${(f.size / 1024 / 1024).toFixed(2)} MB`
    )
    .join("\n\n");

  alert(
    `❌ Không thể xử lý hình ảnh.\n\n` +
    `${fileInfo}\n\n` +
    `Chi tiết lỗi: ${err?.message || "Không xác định"}`
  );
    }
    finally {
  setProcessingImages(false);
}
  };

  const handleUploadImages = async () => {
    if (!detailItem) return;

    if (imageFiles.length === 0) {
      alert("Vui lòng chọn hình ảnh trước.");
      return;
    }

    const existingCount = detailItem.images?.length || 0;

    if (existingCount + imageFiles.length > 20) {
      alert("Mỗi bản ghi chỉ được lưu tối đa 20 hình ảnh.");
      return;
    }

    try {
      setUploadingImages(true);

      const formData = new FormData();

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await api.post(
        `/api/class-lineup-summaries/${detailItem._id}/images`,
        formData
      );

      const updatedRecord: LineUpRecord =
        res.data?.record || {
          ...detailItem,
          images: res.data?.images || detailItem.images || [],
        };

      setDetailItem(updatedRecord);

      setRecords((prev) =>
        prev.map((item) =>
          item._id === updatedRecord._id ? updatedRecord : item
        )
      );

      // Giải phóng preview cũ
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setImageFiles([]);
      setImagePreviews([]);

      // Tải lại ảnh từ backend
      Object.values(detailImageUrls).forEach((url) =>
        URL.revokeObjectURL(url)
      );
      setDetailImageUrls({});

      await loadDetailImages(updatedRecord);

      alert("Upload hình ảnh thành công.");
    } catch (err: any) {
      console.error("Lỗi upload hình ảnh:", err);
      alert(
        err?.response?.data?.message ||
          "Không thể upload hình ảnh."
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (fileId: string) => {
    if (!detailItem) return;

    if (!window.confirm("Bạn có chắc muốn xóa hình ảnh này?")) return;

    try {
      const res = await api.delete(
        `/api/class-lineup-summaries/${detailItem._id}/images/${fileId}`
      );

      const updatedImages =
        res.data?.images ||
        (detailItem.images || []).filter(
          (image) => image.fileId !== fileId
        );

      const oldUrl = detailImageUrls[fileId];
      if (oldUrl) URL.revokeObjectURL(oldUrl);

      setDetailImageUrls((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });

      const updatedRecord = {
        ...detailItem,
        images: updatedImages,
      };

      setDetailItem(updatedRecord);

      setRecords((prev) =>
        prev.map((item) =>
          item._id === updatedRecord._id ? updatedRecord : item
        )
      );
    } catch (err: any) {
      console.error("Lỗi xóa hình ảnh:", err);
      alert(
        err?.response?.data?.message ||
          "Không thể xóa hình ảnh."
      );
    }
  };

  // --- Xóa bản ghi
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      await api.delete(`/api/class-lineup-summaries/${id}`);
      await loadRecords(selectedWeek || undefined);
    } catch (err) {
      console.error("Lỗi khi xóa:", err);
      alert("Không thể xóa bản ghi.");
    }
  };

  // debug nhỏ — mở console xem
  useEffect(() => {
    console.log("weeks:", weeks, "currentWeek:", currentWeek, "selectedWeek:", selectedWeek);
  }, [weeks, currentWeek, selectedWeek]);

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2} fontWeight="bold">
        Ghi nhận lỗi xếp hàng
      </Typography>

      {/* Form ghi nhận */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Lớp"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setSelectedStudents([]);
            }}
            fullWidth
          >
            <MenuItem value="">-- Chọn lớp --</MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Lỗi vi phạm"
            value={violation}
            onChange={(e) => setViolation(e.target.value)}
            fullWidth
          >
            <MenuItem value="">-- Chọn lỗi --</MenuItem>
            {violationOptions.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ position: "relative" }}>
            <TextField
              fullWidth
              label="Học sinh vi phạm (nhập để gợi ý)"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder={className ? "Nhập tên học sinh..." : "Chọn lớp trước để gợi ý học sinh"}
              disabled={!className}
            />
            {suggestions.length > 0 && (
              <Paper
                sx={{
                  position: "absolute",
                  zIndex: 50,
                  mt: 0.5,
                  left: 0,
                  right: 0,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {suggestions.map((s) => (
                  <MenuItem key={s._id} onClick={() => handleSelectSuggestion(s)}>
                    {s.name} {s.className ? `(${s.className})` : ""}
                  </MenuItem>
                ))}
              </Paper>
            )}
          </Box>

          {selectedStudents.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedStudents.map((s) => (
                <Chip key={s} label={s} onDelete={() => removeSelectedStudent(s)} sx={{ mt: 0.5 }} />
              ))}
            </Stack>
          )}
          <TextField
            label="Ngày ghi nhận"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Ghi chú"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />


          {/* 📷 Ảnh ghi nhận vi phạm */}
<Box>
  <Stack direction="row" spacing={1} alignItems="center">
    <input
      ref={cameraInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      style={{ display: "none" }}
      onChange={handleSelectImages}
    />

    <Button
      variant="outlined"
      onClick={() => cameraInputRef.current?.click()}
      disabled={loading}
    >
      📷 Chụp ảnh
    </Button>

    <Typography variant="body2" color="text.secondary">
      Có thể chụp trước khi lưu
    </Typography>
  </Stack>
  {processingImages && (
  <Typography
    variant="body2"
    color="primary"
    sx={{ mt: 1 }}
  >
    ⏳ Đang xử lý ảnh, vui lòng chờ...
  </Typography>
)}
  {/* Preview ảnh chuẩn bị lưu */}
  {newImagePreviews.length > 0 && (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(4, 1fr)",
        },
        gap: 1,
        mt: 1.5,
      }}
    >
      {newImagePreviews.map((preview, index) => (
        <Box
          key={preview}
          sx={{
            position: "relative",
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 1,
            overflow: "hidden",
            aspectRatio: "1 / 1",
          }}
        >
          <img
            src={preview}
            alt={`Ảnh vi phạm ${index + 1}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />

          <IconButton
            size="small"
            color="error"
            onClick={() => {
              URL.revokeObjectURL(newImagePreviews[index]);

              setImagePreviews((prev) =>
                prev.filter((_, i) => i !== index)
              );

              setImageFiles((prev) =>
                prev.filter((_, i) => i !== index)
              );
            }}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              bgcolor: "rgba(255,255,255,0.9)",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  )}
</Box>
          

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={handleSave}>
              Lưu ghi nhận
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setViolation("");
                setStudentInput("");
                setSelectedStudents([]);
                setClassName("");
              }}
            >
              Reset
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Bộ lọc tuần */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Danh sách lớp đã ghi nhận vi phạm</Typography>

        {/* FormControl để Select hiện rõ, không bị "ẩn" */}
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="week-select-label">Chọn tuần</InputLabel>
          <Select
            labelId="week-select-label"
            label="Chọn tuần"
            value={selectedWeek}
            onChange={handleWeekChange}
            displayEmpty
          >
            <MenuItem value="">
              {currentWeek ? `Tuần ${currentWeek} (hiện tại)` : "Tuần hiện tại"}
            </MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={w.weekNumber}>
                Tuần {w.weekNumber}
                {currentWeek === w.weekNumber ? " (hiện tại)" : ""} —{" "}
                {dayjs(w.startDate).format("DD/MM")} → {dayjs(w.endDate).format("DD/MM")}
              </MenuItem>
            ))}
            {weeks.length === 0 && <MenuItem disabled>Không có tuần được khai báo</MenuItem>}
          </Select>
        </FormControl>
      </Box>

      {/* Bảng dữ liệu */}
<TableContainer
  component={Paper}
  sx={{
    width: "100%",
    overflowX: "auto",
    boxShadow: 2,
    borderRadius: 2,
  }}
>
  <Table
    size="small"
    sx={{
      minWidth: 700,
      "& th": { bgcolor: "primary.main", color: "white", whiteSpace: "nowrap" },
      "& td": { whiteSpace: "nowrap", fontSize: { xs: "0.85rem", sm: "0.95rem" } },
    }}
  >
    <TableHead>
      <TableRow>
        
        <TableCell>Lớp</TableCell>
        <TableCell>Lỗi vi phạm</TableCell>
        <TableCell>Học sinh vi phạm</TableCell>
        <TableCell>Thời gian ghi nhận</TableCell>
        <TableCell align="center">Điểm trừ</TableCell>
        <TableCell>Ghi chú</TableCell>
        <TableCell align="center">Thao tác</TableCell>
      </TableRow>
    </TableHead>

    <TableBody>
      {loading ? (
        <TableRow>
          <TableCell colSpan={9} align="center">
            Đang tải...
          </TableCell>
        </TableRow>
      ) : records.length === 0 ? (
        <TableRow>
          <TableCell colSpan={9} align="center">
            Không có dữ liệu
          </TableCell>
        </TableRow>
      ) : (
        records.map((r) => (
          <TableRow
            key={r._id}
            hover
            sx={{
              "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
            }}
          >
            
            <TableCell>{r.className}</TableCell>
            <TableCell>{r.violation}</TableCell>
            <TableCell>{r.studentName || "-"}</TableCell>
            <TableCell>
              {new Date(r.date).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TableCell>
            <TableCell align="center" sx={{ color: "red", fontWeight: 600 }}>
              -{Math.abs(r.scoreChange ?? 10)}
            </TableCell>
            <TableCell sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.note || "-"}
            </TableCell>
            <TableCell align="center">
              <Stack
                direction="row"
                spacing={0.5}
                justifyContent="center"
                alignItems="center"
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openDetailDialog(r)}
                  sx={{
                    minWidth: 88,
                    height: 32,
                    whiteSpace: "nowrap",
                  }}
                >
                  📷 Thêm hình
                </Button>

                <IconButton
                  color="error"
                  onClick={() => handleDelete(r._id)}
                  title="Xóa bản ghi"
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
</TableContainer>

      {/* ============================================================
          📷 DIALOG HÌNH ẢNH VI PHẠM XẾP HÀNG
          ============================================================ */}
      <Dialog
        open={Boolean(detailItem)}
        onClose={closeDetailDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Hình ảnh lỗi xếp hàng
          {detailItem && (
            <Typography
              component="span"
              sx={{ ml: 1, fontSize: "0.9rem", color: "text.secondary" }}
            >
              — {detailItem.className}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {/* Input camera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleSelectImages}
          />

          {/* Input thư viện */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleSelectImages}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Button
              variant="contained"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingImages}
            >
              📷 Chụp ảnh
            </Button>

            <Button
              variant="outlined"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingImages}
            >
              🖼️ Chọn ảnh
            </Button>

            <Typography
              variant="body2"
              sx={{
                alignSelf: "center",
                color: "text.secondary",
              }}
            >
              Tối đa 5 ảnh/lần, 20 ảnh/bản ghi
            </Typography>
          </Stack>

          {/* Ảnh đã lưu */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Hình ảnh đã lưu
          </Typography>

          {loadingDetailImages ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 3,
              }}
            >
              <CircularProgress size={30} />
            </Box>
          ) : detailItem?.images && detailItem.images.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(3, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 1.5,
                mb: 3,
              }}
            >
              {detailItem.images.map((image) => (
                <Box
                  key={image.fileId}
                  sx={{
                    position: "relative",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    overflow: "hidden",
                    aspectRatio: "1 / 1",
                    bgcolor: "grey.100",
                  }}
                >
                  {detailImageUrls[image.fileId] ? (
                    <img
                      src={detailImageUrls[image.fileId]}
                      alt="Hình vi phạm xếp hàng"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  )}

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteImage(image.fileId)}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      bgcolor: "rgba(255,255,255,0.9)",
                      "&:hover": {
                        bgcolor: "white",
                      },
                    }}
                    title="Xóa hình"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Chưa có hình ảnh.
            </Typography>
          )}

          {/* Ảnh đang chờ upload */}
          {imagePreviews.length > 0 && (
            <>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Hình ảnh chờ tải lên
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 1.5,
                }}
              >
                {imagePreviews.map((preview, index) => (
                  <Box
                    key={preview}
                    sx={{
                      position: "relative",
                      border: "1px solid",
                      borderColor: "primary.main",
                      borderRadius: 1,
                      overflow: "hidden",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Ảnh chờ upload ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        URL.revokeObjectURL(imagePreviews[index]);

                        setNewImagePreviews((prev) =>
                          prev.filter((_, i) => i !== index)
                        );

                        setNewImageFiles((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: "rgba(255,255,255,0.9)",
                        "&:hover": {
                          bgcolor: "white",
                        },
                      }}
                      title="Bỏ hình"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetailDialog} disabled={uploadingImages}>
            Đóng
          </Button>

          <Button
            variant="contained"
            onClick={handleUploadImages}
            disabled={uploadingImages || imageFiles.length === 0}
          >
            {uploadingImages ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} />
                Đang tải...
              </>
            ) : (
              "Upload hình ảnh"
            )}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
