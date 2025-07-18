import React, { useState } from 'react';

import { Outlet, useNavigate } from 'react-router-dom';

import {
  Box, Drawer, List, ListItemIcon, ListItemText, ListItemButton,
  AppBar, Toolbar, Typography, IconButton, CssBaseline
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClassIcon from '@mui/icons-material/Class';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext'; // nếu đang dùng AuthContext
const drawerWidth = 240;

const AdminLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>Admin Panel</Typography>
      </Toolbar>

      <List>
        <ListItemButton onClick={() => navigate('/admin/settings')}>
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Cấu hình hệ thống" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/admin/add-class')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Thêm lớp học" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/admin/weeks')}>
          <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
          <ListItemText primary="Quản lý tuần học" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/admin/rules')}>
          <ListItemIcon><PeopleIcon /></ListItemIcon>
          <ListItemText primary="Thêm nội qui" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/admin/users')}>
          <ListItemIcon><PeopleIcon /></ListItemIcon>
          <ListItemText primary="Quản lý người dùng" />
        </ListItemButton>
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <List>
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon><ArrowBackIcon /></ListItemIcon>
          <ListItemText primary="Quay về trang chính" />
        </ListItemButton>

        <ListItemButton onClick={() => {
            logout(); // clear token
            navigate('/'); // về trang login
            }}>
        <ListItemIcon><LogoutIcon /></ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>


      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1, // ensure above Drawer
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            Trang quản trị
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8, // offset AppBar height
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          bgcolor: '#f5f5f5',
          minHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;
