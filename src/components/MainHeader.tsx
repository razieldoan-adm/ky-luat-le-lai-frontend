// src/components/MainHeader.tsx

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogin = () => navigate('/login');
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          HỆ THỐNG QUẢN LÝ THI ĐUA VÀ KỶ LUẬT HỌC SINH
        </Typography>

        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">Xin chào, {user.username}</Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        ) : (
          <Button color="inherit" onClick={handleLogin}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default MainHeader;
