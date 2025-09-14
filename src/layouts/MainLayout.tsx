// src/layouts/MainLayout.tsx
import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import MainHeader from '../components/MainHeader';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

const drawerWidth = 240;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Header (AppBar có nút menu khi mobile) */}
      <MainHeader onMenuClick={handleDrawerToggle} />

      {/* Sidebar responsive */}
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />

      {/* Nội dung chính */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
