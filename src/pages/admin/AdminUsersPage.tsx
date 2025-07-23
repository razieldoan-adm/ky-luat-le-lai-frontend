import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText, IconButton,
  Button, Dialog, DialogTitle, DialogContent, TextField, MenuItem, DialogActions,
  CircularProgress, Snackbar, Alert
} from '@mui/material';
import type { AlertColor } from '@mui/material'; // ✅ import type-only

import { Delete, Edit, Add } from '@mui/icons-material';
import api from '../../api/api';

interface User {
  _id: string;
  username: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student' });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const getAuthHeader = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/userRoutes', getAuthHeader());
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      showSnackbar('Lỗi khi tải người dùng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/api/userRoutes', newUser, getAuthHeader());
      showSnackbar('Tạo user thành công', 'success');
      setOpenCreate(false);
      setNewUser({ username: '', password: '', role: 'student' });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      showSnackbar(err.response?.data?.message || 'Lỗi khi tạo user', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá?')) return;
    try {
      await api.delete(`/api/userRoutes/${id}`, getAuthHeader());
      showSnackbar('Đã xoá user', 'success');
      fetchUsers();
    } catch (err) {
      console.error(err);
      showSnackbar('Lỗi khi xoá user', 'error');
    }
  };

  const handleEditRole = async () => {
    if (!editUser) return;
    try {
      await api.put(`/api/userRoutes/${editUser._id}`, { role: editUser.role }, getAuthHeader());
      showSnackbar('Đã cập nhật role', 'success');
      setOpenEdit(false);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      showSnackbar('Lỗi khi cập nhật role', 'error');
    }
  };

  const showSnackbar = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>👤 Quản lý người dùng</Typography>

      <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
        Thêm người dùng
      </Button>

      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <Paper sx={{ mt: 2 }}>
          <List>
            {users.map(u => (
              <ListItem
                key={u._id}
                secondaryAction={
                  <>
                    <IconButton onClick={() => { setEditUser(u); setOpenEdit(true); }}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(u._id)}>
                      <Delete />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={u.username}
                  secondary={`Role: ${u.role}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Dialog tạo user mới */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Thêm người dùng mới</DialogTitle>
        <DialogContent>
          <TextField
            label="Username"
            fullWidth
            margin="dense"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="dense"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <TextField
            select
            label="Role"
            fullWidth
            margin="dense"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="student">Student</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreate}>Tạo</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog chỉnh sửa role */}
      <Dialog open={openEdit} onClose={() => { setOpenEdit(false); setEditUser(null); }}>
        <DialogTitle>Chỉnh sửa role</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Role"
            fullWidth
            margin="dense"
            value={editUser?.role || ''}
            onChange={(e) => setEditUser(editUser ? { ...editUser, role: e.target.value } : null)}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="teacher">Teacher</MenuItem>
            <MenuItem value="student">Student</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenEdit(false); setEditUser(null); }}>Hủy</Button>
          <Button variant="contained" onClick={handleEditRole}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
