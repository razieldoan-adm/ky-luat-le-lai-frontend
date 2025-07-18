import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Hệ Thống Quản Lý
          </Typography>

          {user ? (
            <>
              <Typography variant="body1" mr={2}>
                Xin chào, {user.name}
              </Typography>
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button color="inherit" onClick={handleLogin}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box p={2}>
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;
