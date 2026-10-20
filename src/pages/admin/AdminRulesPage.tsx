import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  MenuItem,
} from '@mui/material';

import api from '../../api/api';

interface Rule {
  _id: string;
  groupCode: string;
  groupName: string;
  ruleCode: string;
  title: string;
  point: number;
  content: string;
  active: boolean;
}

interface RuleForm {
  groupCode: string;
  groupName: string;
  ruleCode: string;
  title: string;
  point: number;
  content: string;
  active: boolean;
}

// Danh sách mã nhóm được phép chọn
const GROUP_CODES = ['N1', 'N2', 'N3', 'N4', 'N5', 'S1', 'S2'];

// Tên nhóm mẫu.
// Hãy đối chiếu với tên nhóm đang có trong MongoDB trước khi dùng.
const GROUP_NAMES: Record<string, string> = {
  N1: 'Nề nếp – tác phong',
  N2: 'Chuyên cần',
  N3: 'Học tập',
  N4: 'Vệ sinh',
  N5: 'Các nội dung khác',
  S1: 'Nhóm S1',
  S2: 'Tái phạm nghiêm trọng',
};

const emptyForm: RuleForm = {
  groupCode: '',
  groupName: '',
  ruleCode: '',
  title: '',
  point: 1,
  content: '',
  active: true,
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);

  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<RuleForm>(emptyForm);

  const [openDialog, setOpenDialog] = useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // ==========================================
  // LẤY DANH SÁCH RULE
  // ==========================================

  const fetchRules = async () => {
    try {
      setLoading(true);

      const res = await api.get('/api/rules', {
        headers: authHeaders,
      });

      setRules(res.data);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách nội quy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // ==========================================
  // MỞ FORM THÊM
  // ==========================================

  const handleAdd = () => {
  setEditingId(null);

  setForm({
    groupCode: '',
    groupName: '',
    ruleCode: '',
    title: '',
    point: 1,
    content: 'điểm/hs',
    active: true,
  });

  setError('');
  setOpenDialog(true);
};

  // ==========================================
  // MỞ FORM SỬA
  // ==========================================

  const handleEdit = (rule: Rule) => {
    setEditingId(rule._id);

    setForm({
      groupCode: rule.groupCode,
      groupName: rule.groupName,
      ruleCode: rule.ruleCode,
      title: rule.title,
      point: rule.groupCode === 'S2' ? 0 : rule.point,
      content: rule.content || '',
      active: rule.active,
    });

    setError('');
    setOpenDialog(true);
  };

  // ==========================================
  // ĐÓNG FORM
  // ==========================================

  const handleClose = () => {
    setOpenDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  // ==========================================
  // THAY ĐỔI FORM
  // ==========================================

  const handleChange = (
  field: keyof RuleForm,
  value: string | number | boolean
) => {
  if (field === 'groupCode') {
    const groupCode = String(value).toUpperCase();

    setForm((prev) => ({
      ...prev,
      groupCode,
      groupName: GROUP_NAMES[groupCode] || '',
      ruleCode: '',
      point: groupCode === 'S2' ? 0 : (prev.groupCode === 'S2' ? 1 : prev.point),
      content: 'điểm/hs',
    }));

    return;
  }

  setForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};

  // ==========================================
  // LƯU RULE
  // ==========================================

  
const handleSave = async () => {
  setError('');
  setSuccess('');

  if (!form.groupCode.trim()) {
    setError('Vui lòng chọn mã nhóm');
    return;
  }

  if (!form.title.trim()) {
    setError('Vui lòng nhập nội dung vi phạm');
    return;
  }

  if (
    form.point === null ||
    !Number.isFinite(Number(form.point))
  ) {
    setError('Vui lòng nhập điểm trừ hợp lệ');
    return;
  }

  try {
    setLoading(true);

    if (editingId) {
      // Giữ nguyên chức năng cập nhật nội quy.
      await api.put(
        `/api/rules/${editingId}`,
        form,
        {
          headers: authHeaders,
        }
      );

      setSuccess('Đã cập nhật nội quy');
    } else {
      // Backend tự cấp ruleCode và groupName.
      await api.post(
        '/api/rules',
        {
          groupCode: form.groupCode,
          title: form.title.trim(),
          point: form.groupCode === 'S2' ? 0 : Number(form.point),
        },
        {
          headers: authHeaders,
        }
      );

      setSuccess('Đã thêm nội quy');
    }

    handleClose();
    await fetchRules();
  } catch (err: any) {
    console.error(err);

    setError(
      err?.response?.data?.message ||
      'Không thể lưu nội quy'
    );
  } finally {
    setLoading(false);
  }
};


  // ==========================================
  // XÓA RULE
  // ==========================================

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa nội quy này?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await api.delete(
        `/api/rules/${id}`,
        {
          headers: authHeaders,
        }
      );

      setSuccess('Đã xóa nội quy');

      await fetchRules();
    } catch (err) {
      console.error(err);
      setError('Không thể xóa nội quy');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // IMPORT EXCEL
  // ==========================================

  const handleImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const confirmed = window.confirm(
      'Import Excel sẽ XÓA TOÀN BỘ nội quy hiện tại và thay bằng dữ liệu trong file. Bạn có chắc chắn không?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();

      formData.append('file', file);

      const res = await api.post(
        '/api/rules/import',
        formData,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess(
        `Import thành công ${res.data.count} nội quy`
      );

      await fetchRules();
    } catch (err: any) {
      console.error(err);

      const responseData = err?.response?.data;

      if (responseData?.errors?.length) {
        setError(
          responseData.errors.join('\n')
        );
      } else {
        setError(
          responseData?.message ||
          'Import Excel thất bại'
        );
      }
    } finally {
      setLoading(false);

      e.target.value = '';
    }
  };

  // ==========================================
  // TẠO FILE EXCEL MẪU
  // ==========================================

  const handleDownloadTemplate = () => {
    const headers = [
      'groupCode',
      'groupName',
      'ruleCode',
      'title',
      'point',
      'content',
      'active',
    ];

    const exampleRows = [
      [
        'N1',
        'Nề nếp – tác phong',
        'N1-01',
        'Sai quần áo',
        1,
        '',
        'TRUE',
      ],
      [
        'N1',
        'Nề nếp – tác phong',
        'N1-02',
        'Sai đồng phục',
        1,
        '',
        'TRUE',
      ],
      [
        'N1',
        'Nề nếp – tác phong',
        'N1-03',
        'Sai giày',
        1,
        '',
        'TRUE',
      ],
      [
        'N2',
        'Chuyên cần',
        'N2-01',
        'Đi học trễ',
        1,
        '',
        'TRUE',
      ],
      [
        'N3',
        'Học tập',
        'N3-01',
        'Không học bài',
        1,
        '',
        'TRUE',
      ],
      [
        'N4',
        'Vệ sinh',
        'N4-01',
        'Không trực nhật',
        1,
        '',
        'TRUE',
      ],
    ];

    const csvRows = [
      headers,
      ...exampleRows,
    ];

    const csvContent = csvRows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? '');
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      ['\uFEFF' + csvContent],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = 'mau-noi-quy.csv';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Box>
      <Typography
        variant="h5"
        mb={2}
        fontWeight="bold"
      >
        Quản lý Nội Quy
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            whiteSpace: 'pre-line',
          }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* ======================================
          NÚT CHỨC NĂNG
      ====================================== */}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        mb={2}
      >
        <Button
          variant="contained"
          onClick={handleAdd}
        >
          + Thêm nội quy
        </Button>

        <Button
          variant="outlined"
          onClick={handleDownloadTemplate}
        >
          Tải mẫu Excel
        </Button>

        <Button
          variant="outlined"
          component="label"
        >
          Import Excel

          <input
            type="file"
            hidden
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
          />
        </Button>
      </Stack>

      {/* ======================================
          BẢNG RULE
      ====================================== */}

      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                STT
              </TableCell>

              <TableCell>
                Nhóm
              </TableCell>

              <TableCell>
                Mã lỗi
              </TableCell>

              <TableCell>
                Nội dung lỗi
              </TableCell>

              <TableCell>
                Điểm lớp
              </TableCell>

              <TableCell>
                Ghi chú
              </TableCell>

              <TableCell>
                Trạng thái
              </TableCell>

              <TableCell>
                Hành động
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rules.map((rule, index) => (
              <TableRow key={rule._id}>
                <TableCell>
                  {index + 1}
                </TableCell>

                <TableCell>
                  <Stack spacing={0.3}>
                    <Chip
                      label={rule.groupCode}
                      size="small"
                      color="primary"
                    />

                    <Typography variant="body2">
                      {rule.groupName}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Typography
                    fontWeight="bold"
                  >
                    {rule.ruleCode}
                  </Typography>
                </TableCell>

                <TableCell>
                  {rule.title}
                </TableCell>

                <TableCell>
                  {rule.point}
                </TableCell>

                <TableCell>
                  {rule.content || '-'}
                </TableCell>

                <TableCell>
                  {rule.active ? (
                    <Chip
                      label="Đang dùng"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label="Ngừng dùng"
                      size="small"
                    />
                  )}
                </TableCell>

                <TableCell>
                  <Stack
                    direction="row"
                    spacing={1}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        handleEdit(rule)
                      }
                    >
                      Sửa
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() =>
                        handleDelete(rule._id)
                      }
                    >
                      Xóa
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}

            {!rules.length && !loading && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align="center"
                >
                  Chưa có nội quy
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* ======================================
          DIALOG THÊM / SỬA
      ====================================== */}

      <Dialog
        open={openDialog}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId
            ? 'Sửa nội quy'
            : 'Thêm nội quy'}
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
 
          <TextField
            select
            label="Mã nhóm"
            value={form.groupCode}
            onChange={(e) =>
              handleChange('groupCode', e.target.value)
            }
            fullWidth
            required
          >
            {GROUP_CODES.map((code) => (
              <MenuItem key={code} value={code}>
                {code}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            label="Tên nhóm"
            value={form.groupName}
            fullWidth
            InputProps={{ readOnly: true }}
            helperText="Tự động theo mã nhóm đã chọn"
          />
          
          <TextField
            label="Mã nội quy"
            value={
              editingId
                ? form.ruleCode
                : form.groupCode
                  ? 'Backend sẽ tự cấp mã khi lưu'
                  : 'Chọn nhóm trước'
            }
            fullWidth
            InputProps={{ readOnly: true }}
            helperText="Không cần nhập mã thủ công"
          />

            <TextField
              label="Tên lỗi"
              value={form.title}
              onChange={(e) =>
                handleChange(
                  'title',
                  e.target.value
                )
              }
              placeholder="Ví dụ: Sai đồng phục"
              fullWidth
            />

            <TextField
              label="Điểm trừ thi đua lớp"
              type="number"
              value={form.groupCode === 'S2' ? 0 : form.point}
              disabled={form.groupCode === 'S2'}
              onChange={(e) =>
                handleChange(
                  'point',
                  Number(e.target.value)
                )
              }
              fullWidth
              helperText={form.groupCode === 'S2' ? 'Nhóm S2 được cố định 0 điểm trừ thi đua lớp' : undefined}
            />

            <TextField
              label="Ghi chú"
              value={form.content}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Giá trị cố định: điểm/hs"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) =>
                    handleChange(
                      'active',
                      e.target.checked
                    )
                  }
                />
              }
              label="Đang sử dụng"
            />

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleClose}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
          >
            {editingId
              ? 'Lưu thay đổi'
              : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
