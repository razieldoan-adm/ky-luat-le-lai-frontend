
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import api from '../../api/api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import heic2any from 'heic2any';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Ho_Chi_Minh');

interface Violation {
  _id: string;
  name: string;
  className: string;
  description: string;
  time: Date;
  penalty: number;
  handlingMethod: string;
  handled?: boolean;
  handledBy?: string;
  images?: {
    fileId: string;
    url: string;
  }[];
  weekNumber?: number;
}

interface Rule {
  _id: string;
  title: string;
  point: number;
  content: string;
}

interface Week {
  _id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
}

export default function AllViolationStudentPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [filtered, setFiltered] = useState<Violation[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [handledStatus, setHandledStatus] = useState('');
  const [classList, setClassList] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [violationBeingEdited, setViolationBeingEdited] = useState<Violation | null>(null);

  // 📷 Thêm hình ảnh
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [detailImageUrls, setDetailImageUrls] = useState<Record<string, string>>({});
  const [loadingDetailImages, setLoadingDetailImages] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageViolation, setImageViolation] = useState<Violation | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning',
  });

  // ⚙️ Giới hạn
  const [limitGVCNHandling, setLimitGVCNHandling] = useState(false);
  const [settings, setSettings] = useState({
    limitGVCNHandling: 1,
    classViolationLimit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [disabledAfterSave, setDisabledAfterSave] = useState(false); // ✅ Thêm trạng thái disable sau khi lưu

  // -------------------------
  // Fetch setting
  // -------------------------
  const fetchSetting = async () => {
    try {
      const res = await api.get('/api/settings');
      const data = res.data || {};

      const toggle =
        typeof data.limitGVCNHandlingEnabled === 'boolean'
          ? data.limitGVCNHandlingEnabled
          : typeof data.limitGVCNHandling === 'boolean'
          ? data.limitGVCNHandling
          : false;

      const perStudentLimit =
        typeof data.limitGVCNHandling === 'number'
          ? data.limitGVCNHandling
          : typeof data.limitGVCNHandlingNumber === 'number'
          ? data.limitGVCNHandlingNumber
          : Number(data.limitGVCNHandling) || 1;

      const classLimit = Number(data.classViolationLimit) || 10;

      setLimitGVCNHandling(toggle);
      setSettings({
        limitGVCNHandling: perStudentLimit,
        classViolationLimit: classLimit,
      });
    } catch (err) {
      console.error('Lỗi khi lấy setting:', err);
    }
  };

  // -------------------------
  // Toggle giới hạn
  // -------------------------
  const handleToggle = async () => {
    const newValue = !limitGVCNHandling;
    setLimitGVCNHandling(newValue);
    setLoading(true);

    try {
      await api.put('/api/settings/update', {
        limitGVCNHandling: newValue,
        limitGVCNHandlingEnabled: newValue,
      });
      setSnackbar({ open: true, message: 'Đã cập nhật trạng thái giới hạn GVCN', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi cập nhật setting:', err);
      setLimitGVCNHandling(!newValue);
      setSnackbar({ open: true, message: 'Lỗi cập nhật giới hạn', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Lưu settings
  // -------------------------
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const payload = {
        limitGVCNHandling: Number(settings.limitGVCNHandling),
        classViolationLimit: Number(settings.classViolationLimit),
      };
      await api.put('/api/settings/update', payload);
      setSnackbar({ open: true, message: 'Đã lưu cấu hình giới hạn thành công!', severity: 'success' });
      setIsEditing(false);
      setDisabledAfterSave(true); // ✅ Sau khi lưu thì disable
    } catch (err) {
      console.error('Lỗi khi lưu settings:', err);
      setSnackbar({ open: true, message: 'Lỗi khi lưu cấu hình!', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Init
  // -------------------------
  useEffect(() => {
    const init = async () => {
      await fetchSetting();
      await fetchWeeks();
      await fetchClasses();
      await fetchRules();
      await fetchViolations();
    };
    init();
  }, []);

  const fetchWeeks = async () => {
    try {
      const [weeksRes, currentRes] = await Promise.all([
        api.get('/api/academic-weeks/study-weeks'),
        api.get('/api/academic-weeks/current'),
      ]);
      const weekList: Week[] = weeksRes.data;
      setWeeks(weekList);
      if (currentRes.data?.weekNumber) {
        setSelectedWeek(String(currentRes.data.weekNumber));
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tuần học:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get('/api/violations/all/all-student');
      console.log("API COUNT:", res.data.length);   // thêm dòng này
      setViolations(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu vi phạm:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const validClasses: string[] = res.data.filter((cls: any) => cls.teacher).map((cls: any) => cls.className);
      setClassList(validClasses);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách lớp:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy rules:', err);
    }
  };

  const applyFilters = () => {
    let data: Violation[] = [...violations];
    if (selectedClass) data = data.filter((v) => v.className === selectedClass);
    if (selectedWeek) data = data.filter((v) => String(v.weekNumber) === selectedWeek);
    if (handledStatus) {
      if (handledStatus === 'unhandled') data = data.filter((v) => !v.handled);
      else data = data.filter((v) => v.handledBy === handledStatus);
    }
    setFiltered(data);
  };

  const clearFilters = () => {
    setSelectedClass('');
    setSelectedWeek('');
    setHandledStatus('');
    setFiltered(violations);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedWeek, selectedClass, handledStatus, violations]);

  const handleDeleteViolation = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xoá vi phạm này không?')) return;
    try {
      await api.delete(`/api/violations/${id}`);
      await fetchViolations();
    } catch (error) {
      console.error('Lỗi khi xoá vi phạm:', error);
      setSnackbar({ open: true, message: 'Lỗi khi xoá vi phạm', severity: 'error' });
    }
  };

  const handleProcessViolation = async (id: string, handledBy: string) => {
    try {
      const res = await api.patch(`/api/violations/${id}/handle`, { handledBy });
      setViolations((prev) => prev.map((v) => (v._id === id ? res.data : v)));
    } catch (err) {
      console.error('Lỗi khi cập nhật người xử lý:', err);
      setSnackbar({ open: true, message: 'Lỗi khi xử lý vi phạm', severity: 'error' });
    }
  };

  // 📷 Tải và hiển thị ảnh hiện có
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
            const response = await api.get(image.url, { responseType: 'blob' });
            return {
              fileId: image.fileId,
              url: URL.createObjectURL(response.data),
            };
          } catch (error) {
            console.error('❌ Không thể tải hình ảnh:', image.fileId, error);
            return null;
          }
        })
      );

      const imageMap: Record<string, string> = {};
      imageEntries.forEach((item) => {
        if (item) imageMap[item.fileId] = item.url;
      });
      setDetailImageUrls(imageMap);
    } catch (error) {
      console.error('❌ loadDetailImages:', error);
      setSnackbar({ open: true, message: 'Không thể tải hình ảnh.', severity: 'error' });
    } finally {
      setLoadingDetailImages(false);
    }
  };

  const openImageDialog = async (violation: Violation) => {
    setImageViolation(violation);
    setImageFiles([]);
    setImagePreviews([]);
    setDetailImageUrls({});
    setImageDialogOpen(true);
    await loadDetailImages(violation);
  };

// ==========================================================
// 📷 NÉN / CHUYỂN ĐỔI HÌNH ẢNH
// ==========================================================


  // ==========================================================
// 📷 CHỌN / CHỤP HÌNH ẢNH
// ==========================================================

const handleSelectImages = async (
  event: ChangeEvent<HTMLInputElement>
) => {
  const input = event.target;

  const files = Array.from(input.files || []);

  // Cho phép chọn lại cùng file
  input.value = "";

  console.log("📸 handleSelectImages:", files);

  if (files.length === 0) {
    console.log("⚠️ Không có file");
    return;
  }

  try {
    const remaining = 5 - imageFiles.length;

    if (remaining <= 0) {
      setSnackbar({
        open: true,
        message: "Tối đa 5 hình ảnh.",
        severity: "error",
      });
      return;
    }

    const selectedFiles = files.slice(
      0,
      remaining
    );

    console.log(
      "📸 File được chọn:",
      selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))
    );

    const validFiles = selectedFiles.filter(
      (file) => {
        const isImage =
          file.type.startsWith("image/") ||
          /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(
            file.name
          );

        return (
          isImage &&
          file.size <= 15 * 1024 * 1024
        );
      }
    );

    console.log(
      "📸 File hợp lệ:",
      validFiles
    );

    if (validFiles.length === 0) {
      setSnackbar({
        open: true,
        message: "Không có hình ảnh hợp lệ.",
        severity: "error",
      });
      return;
    }

    // =====================================================
    // TEST QUAN TRỌNG:
    // tạo preview NGAY từ file gốc
    // =====================================================

    const previewUrls = validFiles.map(
      (file) =>
        URL.createObjectURL(file)
    );

    console.log(
      "🖼️ Preview URL:",
      previewUrls
    );

    setImageFiles((prev) => [
      ...prev,
      ...validFiles,
    ]);

    setImagePreviews((prev) => [
      ...prev,
      ...previewUrls,
    ]);

    setSnackbar({
      open: true,
      message: `Đã chọn ${validFiles.length} hình ảnh.`,
      severity: "success",
    });

    console.log(
      "✅ ĐÃ THÊM ẢNH VÀO STATE"
    );

  } catch (error) {
    console.error(
      "❌ Lỗi chọn ảnh:",
      error
    );

    setSnackbar({
      open: true,
      message: "Không thể chọn hình ảnh.",
      severity: "error",
    });
  }
};

  const handleUploadImages = async () => {
    if (!imageViolation || imageFiles.length === 0) return;

    const currentImageCount = imageViolation.images?.length || 0;
    if (currentImageCount + imageFiles.length > 20) {
      setSnackbar({
        open: true,
        message: `Vi phạm này đã có ${currentImageCount} ảnh. Tối đa 20 ảnh.`,
        severity: 'error',
      });
      return;
    }

    try {
      setUploadingImages(true);
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append('images', file));

      const res = await api.post(
        `/api/violations/${imageViolation._id}/images`,
        formData
      );

      const updatedImages = res.data?.images || [];
      const updatedItem = { ...imageViolation, images: updatedImages };
      setImageViolation(updatedItem);
      setViolations((prev) =>
        prev.map((v) => (v._id === imageViolation._id ? { ...v, images: updatedImages } : v))
      );

      await loadDetailImages(updatedItem);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImageFiles([]);
      setImagePreviews([]);
      setSnackbar({ open: true, message: 'Đã thêm hình ảnh thành công.', severity: 'success' });
    } catch (error) {
      console.error('Lỗi upload hình ảnh:', error);
      setSnackbar({ open: true, message: 'Không thể upload hình ảnh.', severity: 'error' });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (fileId: string) => {
    if (!imageViolation) return;
    if (!window.confirm('Bạn có chắc muốn xóa hình ảnh này không?')) return;

    try {
      await api.delete(`/api/violations/${imageViolation._id}/images/${fileId}`);
      if (detailImageUrls[fileId]) URL.revokeObjectURL(detailImageUrls[fileId]);

      const updatedImages = (imageViolation.images || []).filter(
        (image) => image.fileId !== fileId
      );
      const updatedItem = { ...imageViolation, images: updatedImages };
      setImageViolation(updatedItem);
      setDetailImageUrls((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setViolations((prev) =>
        prev.map((v) => (v._id === imageViolation._id ? { ...v, images: updatedImages } : v))
      );
      setSnackbar({ open: true, message: 'Đã xóa hình ảnh.', severity: 'success' });
    } catch (error) {
      console.error('❌ Lỗi xóa hình ảnh:', error);
      setSnackbar({ open: true, message: 'Không thể xóa hình ảnh.', severity: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    if (!violationBeingEdited) return;
    try {
      await api.put(`/api/violations/${violationBeingEdited._id}`, violationBeingEdited);
      setSnackbar({ open: true, message: 'Cập nhật thành công', severity: 'success' });
      setEditDialogOpen(false);
      await fetchViolations();
    } catch (error) {
      console.error('Lỗi khi cập nhật vi phạm:', error);
      setSnackbar({ open: true, message: 'Lỗi cập nhật vi phạm', severity: 'error' });
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', py: 4 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Danh sách tất cả học sinh vi phạm
      </Typography>

      {/* ⚙️ Giới hạn xử lý */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }} elevation={3}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            color={limitGVCNHandling ? 'success' : 'error'}
            onClick={handleToggle}
            disabled={loading}
            sx={{ borderRadius: '50px' }}
          >
            {limitGVCNHandling ? '🟢 GIỚI HẠN GVCN: BẬT' : '🔴 GIỚI HẠN GVCN: TẮT'}
          </Button>

          <TextField
              label="Số lần GVCN xử lý/HS/tuần"
              type="number"
              size="small"
              sx={{ width: 200 }}
              value={settings.limitGVCNHandling}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  limitGVCNHandling: Number(e.target.value) || 0,
                }))
              }
              disabled={!isEditing || loading}
              inputProps={{ min: 0 }}
            />
            
            <TextField
              label="Tổng lượt GVCN xử lý/lớp/tuần"
              type="number"
              size="small"
              sx={{ width: 230 }}
              value={settings.classViolationLimit}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  classViolationLimit: Number(e.target.value) || 0,
                }))
              }
              disabled={!isEditing || loading}
              inputProps={{ min: 0 }}
            />


          {isEditing ? (
            <Button variant="contained" color="primary" onClick={handleSaveSettings} disabled={loading || disabledAfterSave}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setIsEditing(true);
                setDisabledAfterSave(false);
              }}
            >
              Điều chỉnh
            </Button>
          )}
        </Stack>
      </Paper>



      {/* Bộ lọc */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 4 }} elevation={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Lọc theo lớp"
            select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">-- Tất cả lớp --</MenuItem>
            {classList.map((cls) => (
              <MenuItem key={cls} value={cls}>
                {cls}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tuần học"
            select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">-- Tất cả tuần --</MenuItem>
            {weeks.map((w) => (
              <MenuItem key={w._id} value={String(w.weekNumber)}>
                Tuần {w.weekNumber} ({dayjs(w.startDate).format('DD/MM')} - {dayjs(w.endDate).format('DD/MM')})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tình trạng xử lý"
            select
            value={handledStatus}
            onChange={(e) => setHandledStatus(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">-- Tất cả --</MenuItem>
            <MenuItem value="unhandled">Chưa xử lý</MenuItem>
            <MenuItem value="GVCN">GVCN xử lý</MenuItem>
            <MenuItem value="PGT">PGT xử lý</MenuItem>
          </TextField>

          <Button variant="contained" onClick={applyFilters}>
            Áp dụng
          </Button>
          <Button variant="outlined" onClick={clearFilters}>
            Xóa lọc
          </Button>
        </Stack>
      </Paper>

      {/* Bảng dữ liệu */}
      <Paper elevation={3} sx={{ borderRadius: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#87cafe' }}>
              <TableCell>STT</TableCell>
              <TableCell>Họ tên</TableCell>
              <TableCell>Lớp</TableCell>
              <TableCell>Tuần</TableCell>
              <TableCell>Lỗi vi phạm</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell>Hình thức xử lý</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Người xử lý</TableCell>
              <TableCell>Điểm</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((v, i) => (
                <TableRow key={v._id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.className}</TableCell>
                  <TableCell>{v.weekNumber || '-'}</TableCell>
                  <TableCell>{v.description}</TableCell>
                  <TableCell>{v.time ? dayjs(v.time).format('DD/MM/YYYY') : 'Không rõ'}</TableCell>
                  <TableCell>{v.handlingMethod || '—'}</TableCell>
                  <TableCell>
  {v.handled
    ? v.handledBy === "PGT"
      ? "PGT đã xử lý"
      : "GVCN đã xử lý"
    : "Chưa xử lý"}
</TableCell>
                  <TableCell>{v.handledBy || ''}</TableCell>
                  <TableCell>{rules.find((r) => r.title === v.description)?.point || 0}</TableCell>
                  <TableCell>
  <Box sx={{ display: "flex", gap: 1 }}>
    {/* Nút xoá */}
    <Button
      variant="outlined"
      color="error"
      size="small"
      onClick={() => handleDeleteViolation(v._id)}
    >
      Xoá
    </Button>

    {/* Nút sửa */}
    <Button
      variant="outlined"
      color="secondary"
      size="small"
      onClick={() => {
        setViolationBeingEdited(v);
        setEditDialogOpen(true);
      }}
    >
      Sửa
    </Button>

    {/* Nút thêm hình ảnh */}
    <Button
      variant="outlined"
      size="small"
      onClick={() => openImageDialog(v)}
    >
      📷 Thêm hình
    </Button>

    {/* Nút GVCN xử lý */}
    <Button
      variant={v.handledBy === "GVCN" ? "contained" : "outlined"}
      color="info"
      size="small"
      onClick={() => handleProcessViolation(v._id, "GVCN")}
    >
      GVCN
    </Button>

    {/* Nút PGT xử lý */}
    <Button
      variant={v.handledBy === "PGT" ? "contained" : "outlined"}
      color="success"
      size="small"
      onClick={() => handleProcessViolation(v._id, "PGT")}
    >
      PGT
    </Button>
  </Box>
</TableCell>

                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  Không có dữ liệu phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Sửa lỗi vi phạm</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Lỗi vi phạm"
              fullWidth
              value={violationBeingEdited?.description || ''}
              onChange={(e) =>
                setViolationBeingEdited((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
            />
            <TextField
              label="Hình thức xử lý"
              fullWidth
              value={violationBeingEdited?.handlingMethod || ''}
              onChange={(e) =>
                setViolationBeingEdited((prev) => (prev ? { ...prev, handlingMethod: e.target.value } : prev))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={imageDialogOpen}
        onClose={() => {
          imagePreviews.forEach((url) => URL.revokeObjectURL(url));
          setImagePreviews([]);
          setImageFiles([]);
          Object.values(detailImageUrls).forEach((url) => URL.revokeObjectURL(url));
          setDetailImageUrls({});
          setImageDialogOpen(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Thêm hình ảnh — {imageViolation?.name} ({imageViolation?.className})
        </DialogTitle>
        <DialogContent dividers>
          {imageViolation && (
            <Stack spacing={2}>
              <Typography fontWeight={600}>
                {imageViolation.description}
              </Typography>

              <Typography variant="h6">Hình ảnh hiện có</Typography>
              {(!imageViolation.images || imageViolation.images.length === 0) ? (
                <Typography color="text.secondary">Chưa có hình ảnh.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {imageViolation.images.map((image) => (
                    <Box key={image.fileId} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                      {loadingDetailImages ? (
                        <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="text.secondary">Đang tải hình ảnh...</Typography>
                        </Box>
                      ) : detailImageUrls[image.fileId] ? (
                        <>
                          <img
                            src={detailImageUrls[image.fileId]}
                            alt="Hình ảnh vi phạm"
                            style={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'contain', display: 'block' }}
                          />
                          <Box sx={{ p: 1 }}>
                            <Button fullWidth size="small" color="error" variant="outlined" onClick={() => handleDeleteImage(image.fileId)}>
                              Xóa hình
                            </Button>
                          </Box>
                        </>
                      ) : (
                        <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="text.secondary">Không thể tải hình ảnh</Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              <Box>
                <Typography variant="h6" gutterBottom>Thêm hình ảnh</Typography>

                <input ref={cameraInputRef} type="file" accept="image/*,.heic,.heif" capture="environment" style={{ display: 'none' }} onChange={handleSelectImages} />
                <input ref={galleryInputRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} onChange={handleSelectImages} />

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="outlined" onClick={() => cameraInputRef.current?.click()}>
                    📷 Chụp ảnh
                  </Button>
                  <Button variant="outlined" onClick={() => galleryInputRef.current?.click()}>
                    🖼️ Chọn ảnh
                  </Button>
                </Stack>

                {imageFiles.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Đã chọn {imageFiles.length} hình ảnh
                  </Typography>
                )}

                <Button variant="contained" sx={{ mt: 2 }} onClick={handleUploadImages} disabled={uploadingImages || imageFiles.length === 0}>
                  {uploadingImages ? 'Đang tải lên...' : 'Tải hình lên'}
                </Button>

                {imagePreviews.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {imagePreviews.map((url, index) => (
                      <Box key={url} sx={{ position: 'relative', width: 100, height: 100, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        <img src={url} alt={`Ảnh ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          onClick={() => {
                            URL.revokeObjectURL(url);
                            setImagePreviews((prev) => prev.filter((_, i) => i !== index));
                            setImageFiles((prev) => prev.filter((_, i) => i !== index));
                          }}
                          sx={{ position: 'absolute', right: 2, top: 2, minWidth: 28, width: 28, height: 28, p: 0, fontSize: 16 }}
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
          <Button onClick={() => {
            imagePreviews.forEach((url) => URL.revokeObjectURL(url));
            setImagePreviews([]);
            setImageFiles([]);
            Object.values(detailImageUrls).forEach((url) => URL.revokeObjectURL(url));
            setDetailImageUrls({});
            setImageDialogOpen(false);
          }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
