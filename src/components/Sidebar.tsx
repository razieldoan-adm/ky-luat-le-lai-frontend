// src/components/Sidebar.tsx

import {
  Box, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RuleIcon from '@mui/icons-material/Rule';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddAlert from '@mui/icons-material/AddAlert';
import GradeIcon from '@mui/icons-material/Grade';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
export default function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          <ListItemButton onClick={() => navigate('/')}>
        <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton onClick={() => navigate('/rules')}>
            <ListItemIcon><RuleIcon /></ListItemIcon>
            <ListItemText primary="Nội qui học sinh" />
          </ListItemButton>

          <ListItemButton onClick={() => navigate('/view-all-violations')}>
            <ListItemIcon><ReportProblemIcon /></ListItemIcon>
            <ListItemText primary="Tổng hợp vi phạm" />
          </ListItemButton>

          <ListItemButton onClick={() => navigate('/view-hygiene-discipline')}>
            <ListItemIcon><CleaningServicesIcon /></ListItemIcon>
            <ListItemText primary="Trật tự - Vệ sinh" />
          </ListItemButton>
          <ListItemButton onClick={() => navigate('/view-final-competition-result')}>
            <ListItemIcon><EmojiEventsIcon /></ListItemIcon>
            <ListItemText primary="Kết quả thi đua tuần" />
          </ListItemButton>


          {(user?.role === 'admin' || user?.role === 'student') && (
            <ListItemButton onClick={() => navigate('/violation')}>
              <ListItemIcon><AddAlert /></ListItemIcon>
              <ListItemText primary="Nhập vi phạm học sinh" />
            </ListItemButton>
          )}

          {user?.role === 'admin' && (
            <>
              <ListItemButton onClick={() => navigate('/emulation')}>
                <ListItemIcon><GradeIcon /></ListItemIcon>
                <ListItemText primary="Nhập điểm thi đua" />
              </ListItemButton>
              <ListItemButton onClick={() => navigate('/admin')}>
                <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                <ListItemText primary="Trang quản trị" />
              </ListItemButton>
            </>
          )}
        </List>
      </Box>
    </Drawer>
  );
}
