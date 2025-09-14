// src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper
} from "@mui/material";
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      // Đã đăng nhập, điều hướng theo role
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "teacher") navigate("/teacher");
      else navigate("/student");
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      const res = await api.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      const userData = {
        username: username.trim(),
        role: res.data.role
      };

      login(userData, res.data.token); // Cập nhật context

      // Điều hướng theo vai trò
      if (res.data.role === "admin") navigate("/admin");
      else if (res.data.role === "teacher") navigate("/teacher");
      else navigate("/student");

    } catch (err) {
      alert("Sai tài khoản hoặc mật khẩu");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 10 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Đăng nhập hệ thống
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            fullWidth
          >
            Đăng nhập
          </Button>

          {/* 🆕 Nút quay về dashboard */}
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#1976d2' }}>
              ← Quay về bảng điều khiển
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
