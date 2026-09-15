
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
  Paper,
  Alert
} from "@mui/material";

import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ======================================================
  // THÔNG BÁO
  // ======================================================
  const [sessionMessage, setSessionMessage] =
    useState("");

  const [loginError, setLoginError] =
    useState("");

  // ======================================================
  // KIỂM TRA LÝ DO BỊ ĐƯA VỀ LOGIN
  // ======================================================
  useEffect(() => {
    const message =
      sessionStorage.getItem(
        "sessionExpiredMessage"
      );

    if (message) {
      setSessionMessage(message);

      // Đọc xong thì xóa để F5 không hiện lại
      sessionStorage.removeItem(
        "sessionExpiredMessage"
      );
    }
  }, []);

  // ======================================================
  // NẾU ĐÃ ĐĂNG NHẬP -> ĐI ĐÚNG TRANG
  // ======================================================
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    }
  }, [user, navigate]);

  // ======================================================
  // ĐĂNG NHẬP
  // ======================================================
  const handleLogin = async () => {
    setLoginError("");

    if (!username.trim() || !password.trim()) {
      setLoginError(
        "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu."
      );
      return;
    }

    try {
      const res = await api.post(
        "/api/auth/login",
        {
          username: username.trim(),
          password: password.trim()
        }
      );

      const userData = {
        username: username.trim(),
        role: res.data.role
      };

      // AuthContext sẽ lưu ngày đăng nhập
      login(
        userData,
        res.data.token
      );

      // ==================================================
      // ĐIỀU HƯỚNG THEO ROLE
      // ==================================================
      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }

    } catch (err) {
      console.error(
        "Lỗi đăng nhập:",
        err
      );

      setLoginError(
        "Sai tài khoản hoặc mật khẩu."
      );
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 10
        }}
      >
        <Typography
          variant="h5"
          align="center"
          gutterBottom
        >
          Đăng nhập hệ thống
        </Typography>

        {/* ==================================================
            THÔNG BÁO PHIÊN HẾT HẠN
        ================================================== */}
        {sessionMessage && (
          <Alert
            severity="warning"
            sx={{
              mb: 2
            }}
          >
            {sessionMessage}
          </Alert>
        )}

        {/* ==================================================
            THÔNG BÁO ĐĂNG NHẬP SAI
        ================================================== */}
        {loginError && (
          <Alert
            severity="error"
            sx={{
              mb: 2
            }}
          >
            {loginError}
          </Alert>
        )}

        <Box
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="Tên đăng nhập"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            fullWidth
          />

          <TextField
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            fullWidth
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            fullWidth
          >
            Đăng nhập
          </Button>

          <Typography
            variant="body2"
            align="center"
            sx={{ mt: 2 }}
          >
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: "#1976d2"
              }}
            >
              ← Quay về bảng điều khiển
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

