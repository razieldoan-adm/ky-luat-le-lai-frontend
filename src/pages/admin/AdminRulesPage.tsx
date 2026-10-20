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
  Divider,
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

interface RuleGroup {
  _id: string;
  groupCode: string;
  groupName: string;
  systemManaged?: boolean;
  nextRuleNumber?: number;
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

const emptyForm: RuleForm = {
  groupCode: '',
  groupName: '',
  ruleCode: '',
  title: '',
  point: 1,
  content: 'điểm/hs',
  active: true,
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [groups, setGroups] = useState<RuleGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [openDialog, setOpenDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPrefix, setNewGroupPrefix] = useState<'N' | 'S'>('N');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const fetchRules = async () => {
    try {
      const res = await api.get('/api/rules', { headers: authHeaders });
      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách nội quy');
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/rules/groups', {
        headers: authHeaders,
      });
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError(
        'Không thể tải danh sách nhóm. Hãy kiểm tra backend đã khai báo API /api/rules/groups chưa.'
      );
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRules(), fetchGroups()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
    // Chỉ tải dữ liệu khi trang được mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // S2 là nhóm hệ thống, không xuất hiện trong lựa chọn tạo nội quy thông thường.
  // Nếu đã có nội quy S2 từ trước, nội quy vẫn được hiển thị trong bảng.
  const selectableGroups = groups.filter(
    (group) => group.groupCode.toUpperCase() !== 'S2'
  );

  const handleAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      groupCode: '',
      groupName: '',
      content: 'điểm/hs',
    });
    setError('');
    setOpenDialog(true);
  };

  const handleEdit = (rule: Rule) => {
    setEditingId(rule._id);
    setForm({
      groupCode: rule.groupCode,
      groupName: rule.groupName,
      ruleCode: rule.ruleCode,
      title: rule.title,
      point: rule.groupCode.toUpperCase() === 'S2' ? 0 : rule.point,
      content: rule.content || 'điểm/hs',
      active: rule.active,
    });
    setError('');
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const handleChange = (
    field: keyof RuleForm,
    value: string | number | boolean
  ) => {
    if (field === 'groupCode') {
      const groupCode = String(value).toUpperCase();
      const selectedGroup = groups.find(
        (group) => group.groupCode.toUpperCase() === groupCode
      );

      setForm((prev) => ({
        ...prev,
        groupCode,
        groupName: selectedGroup?.groupName || '',
        ruleCode: '',
        point:
          groupCode === 'S2'
            ? 0
            : prev.groupCode.toUpperCase() === 'S2'
              ? 1
              : prev.point,
        content: 'điểm/hs',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!form.groupCode.trim()) {
      setError('Vui lòng chọn nhóm nội quy');
      return;
    }
    if (!form.title.trim()) {
      setError('Vui lòng nhập nội dung vi phạm');
      return;
    }
    if (!Number.isFinite(Number(form.point))) {
      setError('Vui lòng nhập điểm trừ hợp lệ');
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        // Backend chỉ cập nhật nội dung, điểm, ghi chú và trạng thái;
        // mã nhóm và mã nội quy được giữ nguyên.
        await api.put(
          `/api/rules/${editingId}`,
          {
            title: form.title.trim(),
            point: form.groupCode.toUpperCase() === 'S2' ? 0 : Number(form.point),
            content: form.content || 'điểm/hs',
            active: form.active,
          },
          { headers: authHeaders }
        );
        setSuccess('Đã cập nhật nội quy');
      } else {
        // Backend tự cấp mã nội quy và lấy tên nhóm từ RuleGroup.
        await api.post(
          '/api/rules',
          {
            groupCode: form.groupCode,
            title: form.title.trim(),
            point: Number(form.point),
          },
          { headers: authHeaders }
        );
        setSuccess('Đã thêm nội quy');
      }

      handleClose();
      await Promise.all([fetchRules(), fetchGroups()]);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Không thể lưu nội quy');
    } finally {
      setLoading(false);
    }
  };

  const getNextGroupCode = (prefix: 'N' | 'S') => {
    const minimumReservedNumber = prefix === 'N' ? 5 : 2; // S2 dành riêng cho hệ thống.
    const pattern = new RegExp(`^${prefix}(\\d+)$`, 'i');
    const maxNumber = groups.reduce((max, group) => {
      const match = group.groupCode.toUpperCase().match(pattern);
      return match ? Math.max(max, Number(match[1])) : max;
    }, minimumReservedNumber);
    return `${prefix}${maxNumber + 1}`;
  };

  const handleCreateGroup = async () => {
    setError('');
    setSuccess('');

    const groupName = newGroupName.trim();
    if (!groupName) {
      setError('Vui lòng nhập tên nhóm nội quy');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(
        '/api/rules/groups',
        { groupName, groupPrefix: newGroupPrefix },
        { headers: authHeaders }
      );

      setNewGroupName('');
      setNewGroupPrefix('N');
      setOpenGroupDialog(false);
      await fetchGroups();

      const createdGroup = res.data as RuleGroup;
      setSuccess(
        `Đã tạo nhóm ${createdGroup.groupCode} – ${createdGroup.groupName}.`
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || 'Không thể tạo nhóm nội quy'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rule: Rule) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nội quy ${rule.ruleCode} – ${rule.title}?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');
      await api.delete(`/api/rules/${rule._id}`, {
        headers: authHeaders,
      });
      setSuccess('Đã xóa nội quy. Mã đã cấp sẽ không được sử dụng lại.');
      await Promise.all([fetchRules(), fetchGroups()]);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Không thể xóa nội quy');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'CẢNH BÁO: Import Excel sẽ xóa toàn bộ nội quy hiện tại rồi thay bằng dữ liệu trong file. Việc này có thể ảnh hưởng các mã nội quy đang dùng. Hãy sao lưu dữ liệu trước khi tiếp tục. Bạn có chắc chắn không?'
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

      const res = await api.post('/api/rules/import', formData, {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`Import thành công ${res.data.count} nội quy`);
      await Promise.all([fetchRules(), fetchGroups()]);
    } catch (err: any) {
      console.error(err);
      const responseData = err?.response?.data;

      if (responseData?.errors?.length) {
        setError(responseData.errors.join('\n'));
      } else {
        setError(responseData?.message || 'Import Excel thất bại');
      }
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

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
      ['N1', 'Tên nhóm N1 hiện có', 'N1-01', 'Sai quần áo', 1, 'điểm/hs', 'TRUE'],
      ['N2', 'Tên nhóm N2 hiện có', 'N2-01', 'Đi học trễ', 1, 'điểm/hs', 'TRUE'],
      ['N3', 'Tên nhóm N3 hiện có', 'N3-01', 'Không học bài', 1, 'điểm/hs', 'TRUE'],
    ];

    const csvContent = [headers, ...exampleRows]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? '');
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mau-noi-quy.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h5" mb={2} fontWeight="bold">
        Quản lý Nội Quy
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, whiteSpace: 'pre-line' }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        mb={2}
        flexWrap="wrap"
      >
        <Button variant="contained" onClick={handleAdd} disabled={loading}>
          + Thêm nội quy
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setNewGroupName('');
            setError('');
            setOpenGroupDialog(true);
          }}
          disabled={loading}
        >
          + Quản lý nhóm / Thêm nhóm
        </Button>
        <Button
          variant="outlined"
          onClick={handleDownloadTemplate}
          disabled={loading}
        >
          Tải mẫu Excel
        </Button>
        <Button
          variant="outlined"
          component="label"
          disabled={loading}
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

      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        Danh sách nhóm nội quy ({groups.length})
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
        {groups.map((group) => (
          <Chip
            key={group._id || group.groupCode}
            label={`${group.groupCode} – ${group.groupName}`}
            color={group.groupCode.trim().toUpperCase().startsWith('S') ? 'error' : 'default'}
            variant="outlined"
          />
        ))}
        {!groups.length && (
          <Typography variant="body2" color="text.secondary">
            Chưa tải được danh sách nhóm.
          </Typography>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" fontWeight="bold" mb={1}>
        Danh sách nội quy
      </Typography>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Nhóm</TableCell>
              <TableCell>Mã lỗi</TableCell>
              <TableCell>Nội dung lỗi</TableCell>
              <TableCell>Điểm lớp</TableCell>
              <TableCell>Ghi chú</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule, index) => (
              <TableRow key={rule._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Stack spacing={0.3}>
                    <Chip label={rule.groupCode} size="small"
                      color={rule.groupCode.trim().toUpperCase().startsWith('S') ? 'error' : 'primary'}
                    />
                    <Typography variant="body2">{rule.groupName}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">{rule.ruleCode}</Typography>
                </TableCell>
                <TableCell>{rule.title}</TableCell>
                <TableCell>{rule.point}</TableCell>
                <TableCell>{rule.content || '-'}</TableCell>
                <TableCell>
                  {rule.active ? (
                    <Chip label="Đang dùng" color="success" size="small" />
                  ) : (
                    <Chip label="Ngừng dùng" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(rule)}
                      disabled={loading}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(rule)}
                      disabled={loading || rule.groupCode.toUpperCase() === 'S2'}
                    >
                      Xóa
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!rules.length && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Chưa có nội quy
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Đang xử lý...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Dialog thêm/sửa nội quy */}
      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Sửa nội quy' : 'Thêm nội quy'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Nhóm nội quy"
              value={form.groupCode}
              onChange={(e) => handleChange('groupCode', e.target.value)}
              fullWidth
              required
              disabled={Boolean(editingId)}
              helperText={
                editingId
                  ? 'Không thể đổi nhóm của nội quy đã tạo.'
                  : 'Chọn nhóm có sẵn. Muốn thêm nhóm mới, dùng nút Quản lý nhóm.'
              }
            >
              {selectableGroups.map((group) => (
                <MenuItem key={group.groupCode} value={group.groupCode}>
                  {group.groupCode} – {group.groupName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Tên nhóm"
              value={form.groupName}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Tên nhóm được lấy từ danh sách nhóm đã lưu."
            />

            <TextField
              label="Mã nội quy"
              value={
                editingId
                  ? form.ruleCode
                  : form.groupCode
                    ? 'Backend tự cấp mã khi lưu'
                    : 'Chọn nhóm trước'
              }
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Mã được cấp tự động và không nhập thủ công."
            />

            <TextField
              label="Tên lỗi / Nội dung vi phạm"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ví dụ: Sai đồng phục"
              fullWidth
              required
            />

            <TextField
              label="Điểm trừ thi đua lớp"
              type="number"
              value={form.groupCode.toUpperCase() === 'S2' ? 0 : form.point}
              disabled={form.groupCode.toUpperCase() === 'S2'}
              onChange={(e) => handleChange('point', Number(e.target.value))}
              fullWidth
              helperText={
                form.groupCode.toUpperCase() === 'S2'
                  ? 'Nhóm S2 được cố định 0 điểm trừ thi đua lớp.'
                  : undefined
              }
            />

            <TextField
              label="Ghi chú"
              value={form.content || 'điểm/hs'}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Giá trị cố định: điểm/hs"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                />
              }
              label="Đang sử dụng"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {editingId ? 'Lưu thay đổi' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog tạo nhóm nội quy */}
      <Dialog
        open={openGroupDialog}
        onClose={() => {
          if (!loading) setOpenGroupDialog(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Thêm nhóm nội quy</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Chọn loại mã nhóm bên dưới. Hệ thống sẽ tự cấp mã tiếp theo dựa
              trên các nhóm đã lưu. S2 được dành riêng cho chức năng hệ thống,
              vì vậy nhóm S mới bắt đầu từ S3.
            </Alert>
            <TextField
              select
              label="Loại mã nhóm"
              value={newGroupPrefix}
              onChange={(e) => setNewGroupPrefix(e.target.value as 'N' | 'S')}
              fullWidth
            >
              <MenuItem value="N">N — Nhóm thông thường (N6, N7, N8...)</MenuItem>
              <MenuItem value="S">S — Nhóm nghiêm trọng (S3, S4, S5...)</MenuItem>
            </TextField>
            <Alert severity="success">
              Mã dự kiến được cấp: <strong>{getNextGroupCode(newGroupPrefix)}</strong>
              <br />
              Đây là mã dự kiến; backend sẽ xác nhận và cấp mã chính thức khi lưu.
            </Alert>
            <TextField
              label="Tên nhóm nội quy"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Ví dụ: Bảo quản cơ sở vật chất"
              inputProps={{ maxLength: 120 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenGroupDialog(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={loading || !newGroupName.trim()}
          >
            Tạo nhóm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
