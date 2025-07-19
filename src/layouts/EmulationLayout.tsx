import React, { useState } from 'react';

import { Outlet, useNavigate } from 'react-router-dom';

import {
  Box, Drawer, List, ListItemIcon, ListItemText, ListItemButton,
  AppBar, Toolbar, Typography, IconButton, CssBaseline
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuBook from '@mui/icons-material/MenuBook';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClassIcon from '@mui/icons-material/Class';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';
const drawerWidth = 240;

const EmulationLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>Tổng hợp thi đua tuần</Typography>
      </Toolbar>

      {/* Danh sách menu chính */}
      <List>
        <ListItemButton onClick={() => navigate('/emulation/class-academic-scores')}>
          <ListItemIcon><MenuBook /></ListItemIcon>
          <ListItemText primary="Nhập điểm sổ đầu bài" />
        </ListItemButton>

         <ListItemButton onClick={() => navigate('/emulation/class-violation-scores')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Nhập điểm kỷ luật" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/emulation/class-hygiene-score')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Nhập điểm vệ sinh" />
        </ListItemButton>

          <ListItemButton onClick={() => navigate('/emulation/class-attendance-summaries')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Nhập điểm chuyên cần" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/emulation/class-lineup-summaries')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Nhập điểm xếp hàng" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/emulation/weekly-scores')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Xuất điểm thi đua" />
        </ListItemButton>
      </List>

      {/* Spacer đẩy nút quay về xuống cuối */}
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
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
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
          <Typography variant="h6" noWrap>Trang thi đua</Typography> 
          
        </Toolbar>
      </AppBar>
        
      {/* Sidebar responsive */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        {/* Mobile drawer */}
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

        {/* Desktop drawer */}
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
          overflowY: 'auto',
          maxWidth: '100%',
        }}
      >
        <Outlet />
      </Box>
    </Box>
    
  );
};

export default EmulationLayout;
