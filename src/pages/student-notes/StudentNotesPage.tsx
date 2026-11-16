
import { useEffect, useState } from 'react';
import api from '../../api/api';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  Add,
  Delete,
  Edit,
  FileDownload,
  Notes,
  Save,
  Search,
  Settings,
  Close,
} from '@mui/icons-material';

import * as XLSX from 'xlsx';

// ==============================
// INTERFACES
// ==============================

interface StudentSuggestion {
  _id: string;
  name: string;
  className: string;
}

interface ClassOption {
  _id: string;
  className: string;
  teacher: string;
}

interface SelectedStudent {
  _id: string;
  name: string;
  className: string;
}

interface StudentInNote {
  studentId: string;
  studentName: string;
  className: string;
}

interface StudentNote {
  _id: string;
  students: StudentInNote[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentNoteTemplate {
  _id: string;
  content: string;
  active: boolean;
}

// ==============================
// MAIN COMPONENT
// ==============================

export default function StudentNotesPage() {
  // Student search
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);

  // Note
  const [note, setNote] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Data
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [templates, setTemplates] = useState<StudentNoteTemplate[]>([]);

  // Loading
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search records
  const [recordSearch, setRecordSearch] = useState('');

  // Edit note
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [editText, setEditText] = useState('');

  // Template management
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateEditId, setTemplateEditId] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  // Notification
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const showMessage = (
    text: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setMessage(text);
    setSeverity(type);
    setSnackbarOpen(true);
  };

  // ==============================
  // LOAD DATA
  // ==============================

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/student-notes');
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Lỗi lấy danh sách ghi chú:', error);
      showMessage('Không thể tải danh sách ghi chú', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/student-note-templates?all=true');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Lỗi lấy ghi chú mẫu:', error);
      showMessage('Không thể tải danh mục ghi chú mẫu', 'error');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes/with-teacher');
      setClassOptions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Lỗi lấy danh sách lớp:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchTemplates();
    fetchClasses();
  }, []);

  // ==============================
  // SEARCH STUDENTS
  // ==============================

  useEffect(() => {
    if (!name.trim() && !className.trim()) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();

        if (name.trim()) {
          params.append('name', name.trim());
          params.append(
            'normalizedName',
            name.trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .replace(/Đ/g, 'D')
              .toLowerCase()
          );
        }

        if (className.trim()) {
          params.append('className', className.trim());
        }

        const res = await api.get(
          `/api/students/search?${params.toString()}`
        );

        const result: StudentSuggestion[] = Array.isArray(res.data)
          ? res.data
          : [];

        // Không hiển thị học sinh đã chọn
        const selectedIds = new Set(
          selectedStudents.map((s) => s._id)
        );

        setSuggestions(
          result.filter((s) => !selectedIds.has(s._id))
        );
      } catch (error) {
        console.error('Lỗi tìm học sinh:', error);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, className, selectedStudents]);

  // Chọn học sinh
  const handleSelectStudent = (student: StudentSuggestion) => {
    setSelectedStudents((prev) => {
      if (prev.some((s) => s._id === student._id)) {
        return prev;
      }

      return [
        ...prev,
        {
          _id: student._id,
          name: student.name,
          className: student.className,
        },
      ];
    });

    setName('');
    setSuggestions([]);
  };

  // Bỏ học sinh
  const handleRemoveStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.filter((s) => s._id !== id)
    );
  };

  // ==============================
  // SELECT TEMPLATE
  // ==============================

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);

    if (!id) return;

    const template = templates.find((t) => t._id === id);

    if (template) {
      // Sao chép nội dung mẫu vào ô nhập.
      // Người dùng có thể sửa mà không ảnh hưởng mẫu gốc.
      setNote(template.content);
    }
  };

  // ==============================
  // CREATE NOTE
  // ==============================

  const handleSaveNote = async () => {
    if (selectedStudents.length === 0) {
      showMessage('Vui lòng chọn ít nhất một học sinh', 'error');
      return;
    }

    if (!note.trim()) {
      showMessage('Vui lòng nhập nội dung ghi chú', 'error');
      return;
    }

    try {
      setSaving(true);

      await api.post('/api/student-notes', {
        studentIds: selectedStudents.map((s) => s._id),
        note: note.trim(),
      });

      showMessage('Đã lưu ghi nhận thành công');

      setSelectedStudents([]);
      setName('');
      setNote('');
      setSelectedTemplate('');
      setSuggestions([]);

      await fetchNotes();
    } catch (error: any) {
      console.error('Lỗi lưu ghi chú:', error);

      showMessage(
        error.response?.data?.message || 'Không thể lưu ghi chú',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // EDIT NOTE
  // ==============================

  const handleOpenEdit = (item: StudentNote) => {
    setEditingNote(item);
    setEditText(item.note);
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    if (!editText.trim()) {
      showMessage('Nội dung ghi chú không được để trống', 'error');
      return;
    }

    try {
      await api.put(`/api/student-notes/${editingNote._id}`, {
        studentIds: editingNote.students.map((s) =>
          String(s.studentId)
        ),
        note: editText.trim(),
      });

      showMessage('Đã cập nhật ghi chú');
      setEditingNote(null);

      await fetchNotes();
    } catch (error: any) {
      console.error('Lỗi cập nhật:', error);

      showMessage(
        error.response?.data?.message || 'Không thể cập nhật',
        'error'
      );
    }
  };

  // ==============================
  // DELETE NOTE
  // ==============================

  const handleDeleteNote = async (id: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa nội dung ghi nhận này?'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/student-notes/${id}`);

      showMessage('Đã xóa ghi nhận');
      await fetchNotes();
    } catch (error) {
      console.error('Lỗi xóa:', error);
      showMessage('Không thể xóa ghi nhận', 'error');
    }
  };

  // ==============================
  // TEMPLATE MANAGEMENT
  // ==============================

  const handleOpenTemplateDialog = () => {
    setTemplateEditId('');
    setTemplateDraft('');
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: StudentNoteTemplate) => {
    setTemplateEditId(template._id);
    setTemplateDraft(template.content);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateDraft.trim()) {
      showMessage('Vui lòng nhập nội dung mẫu', 'error');
      return;
    }

    try {
      setTemplateSaving(true);

      if (templateEditId) {
        await api.put(
          `/api/student-note-templates/${templateEditId}`,
          {
            content: templateDraft.trim(),
          }
        );

        showMessage('Đã cập nhật nội dung mẫu');
      } else {
        await api.post('/api/student-note-templates', {
          content: templateDraft.trim(),
        });

        showMessage('Đã thêm nội dung mẫu');
      }

      setTemplateDialogOpen(false);
      setTemplateDraft('');
      setTemplateEditId('');

      await fetchTemplates();
    } catch (error: any) {
      console.error('Lỗi lưu mẫu:', error);

      showMessage(
        error.response?.data?.message || 'Không thể lưu mẫu',
        'error'
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleToggleTemplate = async (
    template: StudentNoteTemplate
  ) => {
    try {
      await api.put(
        `/api/student-note-templates/${template._id}`,
        {
          active: !template.active,
        }
      );

      showMessage(
        template.active
          ? 'Đã tắt nội dung mẫu'
          : 'Đã bật nội dung mẫu'
      );

      await fetchTemplates();
    } catch (error) {
      console.error('Lỗi thay đổi trạng thái:', error);
      showMessage('Không thể thay đổi trạng thái mẫu', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn xóa ghi chú mẫu này?'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/api/student-note-templates/${id}`);

      showMessage('Đã xóa nội dung mẫu');
      await fetchTemplates();
    } catch (error) {
      console.error('Lỗi xóa mẫu:', error);
      showMessage('Không thể xóa nội dung mẫu', 'error');
    }
  };

  // ==============================
  // EXPORT EXCEL
  // ==============================

  const handleExportExcel = () => {
    if (filteredNotes.length === 0) {
      showMessage('Không có dữ liệu để xuất Excel', 'error');
      return;
    }

    const rows: Record<string, any>[] = [];

    filteredNotes.forEach((item) => {
      item.students.forEach((student) => {
        rows.push({
          'STT': rows.length + 1,
          'Họ tên học sinh': student.studentName,
          'Lớp': student.className,
          'Nội dung ghi chú': item.note,
          'Ngày ghi nhận': new Date(
            item.createdAt
          ).toLocaleDateString('vi-VN'),
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 12 },
      { wch: 60 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Ghi chú học sinh'
    );

    XLSX.writeFile(
      workbook,
      `Ghi_chu_hoc_sinh_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

    showMessage('Đã xuất file Excel');
  };

  // ==============================
  // FILTER RECORDS
  // ==============================

  const filteredNotes = notes.filter((item) => {
    const keyword = recordSearch.trim().toLowerCase();

    if (!keyword) return true;

    return (
      item.note.toLowerCase().includes(keyword) ||
      item.students.some(
        (s) =>
          s.studentName.toLowerCase().includes(keyword) ||
          s.className.toLowerCase().includes(keyword)
      )
    );
  });

  const totalStudents = filteredNotes.reduce(
    (total, item) => total + item.students.length,
    0
  );

  // ==============================
  // RENDER
  // ==============================

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 5 }}>

      {/* HEADER */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            <Notes sx={{ verticalAlign: 'middle', mr: 1 }} />
            Ghi nhận học sinh
          </Typography>

          <Typography color="text.secondary" variant="body2">
            Ghi chú và theo dõi học sinh, độc lập với hồ sơ vi phạm.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={handleOpenTemplateDialog}
        >
          Quản lý ghi chú mẫu
        </Button>
      </Stack>

      {/* ==============================
          CREATE NOTE
      ============================== */}

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }} elevation={2}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          1. Tạo ghi nhận mới
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={2}>

          {/* CLASS FILTER */}
          <TextField
            select
            label="Lọc theo lớp"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            fullWidth
          >
            <MenuItem value="">Tất cả các lớp</MenuItem>

            {classOptions.map((cls) => (
              <MenuItem key={cls._id} value={cls.className}>
                {cls.className}
                {cls.teacher ? ` — ${cls.teacher}` : ''}
              </MenuItem>
            ))}
          </TextField>

          {/* SEARCH STUDENT */}
          <TextField
            label="Tìm học sinh theo tên"
            placeholder="Nhập tên học sinh..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <Search sx={{ mr: 1, color: 'action.active' }} />
              ),
            }}
          />

          {/* SUGGESTIONS */}
          {suggestions.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {suggestions.map((student) => (
                <Box
                  key={student._id}
                  onClick={() => handleSelectStudent(student)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Typography fontWeight="medium">
                    {student.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Lớp: {student.className}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}

          {/* SELECTED STUDENTS */}
          <Box>
            <Typography fontWeight="bold" mb={1}>
              Học sinh đã chọn ({selectedStudents.length})
            </Typography>

            {selectedStudents.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Chưa chọn học sinh.
              </Typography>
            ) : (
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1}
              >
                {selectedStudents.map((student) => (
                  <Chip
                    key={student._id}
                    label={`${student.name} (${student.className})`}
                    onDelete={() =>
                      handleRemoveStudent(student._id)
                    }
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}

            {selectedStudents.length > 0 && (
              <Button
                size="small"
                color="error"
                sx={{ mt: 1 }}
                onClick={() => setSelectedStudents([])}
              >
                Xóa tất cả học sinh đã chọn
              </Button>
            )}
          </Box>

          <Divider />

          {/* TEMPLATE SELECT */}
          <TextField
            select
            label="Chọn nội dung ghi chú mẫu (không bắt buộc)"
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            fullWidth
          >
            <MenuItem value="">
              -- Nhập nội dung thủ công --
            </MenuItem>

            {templates
              .filter((t) => t.active)
              .map((template) => (
                <MenuItem
                  key={template._id}
                  value={template._id}
                >
                  {template.content}
                </MenuItem>
              ))}
          </TextField>

          {/* NOTE CONTENT */}
          <TextField
            label="Nội dung ghi chú"
            placeholder="Nhập nội dung cần ghi nhận..."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSelectedTemplate('');
            }}
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
          />

          <Typography variant="caption" color="text.secondary">
            Bạn có thể sửa nội dung sau khi chọn mẫu. Việc chỉnh sửa
            không làm thay đổi nội dung mẫu đã lưu.
          </Typography>

          {/* SAVE */}
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSaveNote}
            disabled={
              saving ||
              selectedStudents.length === 0 ||
              !note.trim()
            }
          >
            {saving ? 'Đang lưu...' : 'Lưu ghi nhận'}
          </Button>

        </Stack>
      </Paper>

      {/* ==============================
          NOTE LIST
      ============================== */}

      <Paper sx={{ p: { xs: 2, sm: 3 } }} elevation={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              2. Danh sách ghi nhận
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {filteredNotes.length} lần ghi nhận · {totalStudents} lượt học sinh
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownload />}
            onClick={handleExportExcel}
          >
            Xuất Excel
          </Button>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Tìm theo tên học sinh, lớp hoặc nội dung..."
          value={recordSearch}
          onChange={(e) => setRecordSearch(e.target.value)}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredNotes.length === 0 ? (
          <Typography
            color="text.secondary"
            textAlign="center"
            sx={{ py: 4 }}
          >
            Chưa có dữ liệu ghi nhận.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#eeeeee' }}>
                  <TableCell width="55px">STT</TableCell>
                  <TableCell>Học sinh</TableCell>
                  <TableCell>Nội dung ghi chú</TableCell>
                  <TableCell width="115px">Ngày ghi nhận</TableCell>
                  <TableCell align="center" width="105px">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredNotes.map((item, index) => (
                  <TableRow key={item._id} hover>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell>
                      <Stack spacing={0.5}>
                        {item.students.map((student, i) => (
                          <Typography
                            key={`${student.studentId}-${i}`}
                            variant="body2"
                          >
                            <strong>{student.studentName}</strong>
                            {' — '}
                            {student.className}
                          </Typography>
                        ))}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ minWidth: 180, whiteSpace: 'pre-wrap' }}>
                      {item.note}
                    </TableCell>

                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>

                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        size="small"
                        title="Chỉnh sửa"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit />
                      </IconButton>

                      <IconButton
                        color="error"
                        size="small"
                        title="Xóa"
                        onClick={() => handleDeleteNote(item._id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ==============================
          EDIT NOTE DIALOG
      ============================== */}

      <Dialog
        open={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Chỉnh sửa ghi nhận</DialogTitle>

        <DialogContent>
          {editingNote && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography fontWeight="bold">
                Học sinh được ghi nhận:
              </Typography>

              {editingNote.students.map((student, index) => (
                <Typography variant="body2" key={index}>
                  {student.studentName} — {student.className}
                </Typography>
              ))}

              <TextField
                label="Nội dung ghi chú"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                multiline
                minRows={4}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditingNote(null)}>
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={handleUpdateNote}
            disabled={!editText.trim()}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==============================
          TEMPLATE MANAGEMENT DIALOG
      ============================== */}

      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Quản lý nội dung ghi chú mẫu

            <IconButton onClick={() => setTemplateDialogOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Paper
            variant="outlined"
            sx={{ p: 2, mb: 3, bgcolor: '#fafafa' }}
          >
            <Typography fontWeight="bold" mb={2}>
              {templateEditId ? 'Chỉnh sửa nội dung mẫu' : 'Thêm nội dung mẫu'}
            </Typography>

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Nội dung mẫu"
              placeholder="Nhập nội dung ghi chú mẫu..."
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Button
                variant="contained"
                startIcon={templateEditId ? <Save /> : <Add />}
                onClick={handleSaveTemplate}
                disabled={templateSaving || !templateDraft.trim()}
              >
                {templateSaving
                  ? 'Đang lưu...'
                  : templateEditId
                    ? 'Cập nhật'
                    : 'Thêm nội dung'}
              </Button>

              {templateEditId && (
                <Button
                  onClick={() => {
                    setTemplateEditId('');
                    setTemplateDraft('');
                  }}
                >
                  Hủy sửa
                </Button>
              )}
            </Stack>
          </Paper>

          <Typography fontWeight="bold" mb={1}>
            Danh sách nội dung mẫu
          </Typography>

          {templates.length === 0 ? (
            <Typography color="text.secondary">
              Chưa có nội dung mẫu.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nội dung</TableCell>
                    <TableCell align="center">Sử dụng</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template._id}>
                      <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                        {template.content}
                      </TableCell>

                      <TableCell align="center">
                        <Switch
                          checked={template.active}
                          onChange={() =>
                            handleToggleTemplate(template)
                          }
                        />
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit />
                        </IconButton>

                        <IconButton
                          color="error"
                          onClick={() =>
                            handleDeleteTemplate(template._id)
                          }
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICATION */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={severity}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>

    </Box>
  );
}
