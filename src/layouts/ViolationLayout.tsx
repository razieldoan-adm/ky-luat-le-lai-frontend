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
import { useAuth } from '../contexts/AuthContext'; // nếu đang dùng AuthContext

// bên trong component


const ViolationLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
const drawerWidth = 240;
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>Ghi nhận kỷ luật</Typography>
      </Toolbar>

      {/* Danh sách menu chính */}
      <List>
        <ListItemButton onClick={() => navigate('/violation/')}>
          <ListItemIcon><MenuBook /></ListItemIcon>
          <ListItemText primary="Ghi nhận vi phạm" />
        </ListItemButton>
       

        <ListItemButton onClick={() => navigate('/violation/unhandled')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Danh sách vi phạm chưa xử lý" />
        </ListItemButton>
          <ListItemButton onClick={() => navigate('/violation/all-violations')}>
          <ListItemIcon><ClassIcon /></ListItemIcon>
          <ListItemText primary="Danh sách vi phạm tổng hợp" />
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
          <Typography variant="h6" noWrap>Trang ghi nhận kỷ luật</Typography> 
          
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

export default ViolationLayout;
