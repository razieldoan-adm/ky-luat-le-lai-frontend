import { Outlet, Link } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Box,
} from "@mui/material";

export default function Layout() {
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6">Quản lý học sinh</Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: 240 }}>
        <List>
          <ListItemButton component={Link} to="/">
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton component={Link} to="/rules">
            <ListItemText primary="Nội quy" />
          </ListItemButton>
          <ListItemButton component={Link} to="/view-all-violations">
            <ListItemText primary="Xem vi phạm" />
          </ListItemButton>
          <ListItemButton component={Link} to="/view-hygiene-discipline">
            <ListItemText primary="Vệ sinh - Kỷ luật" />
          </ListItemButton>
          <ListItemButton component={Link} to="/view-final-competition-result">
            <ListItemText primary="Điểm thi đua" />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
