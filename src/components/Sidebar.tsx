import { Drawer, List, ListItem, ListItemText, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { Link } from "react-router-dom";

const drawerWidth = 240;

export default function Sidebar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);

  const drawerContent = (
    <List>
      <ListItem button component={Link} to="/">
        <ListItemText primary="Dashboard" />
      </ListItem>
      <ListItem button component={Link} to="/rules">
        <ListItemText primary="Rules" />
      </ListItem>
      <ListItem button component={Link} to="/view-all-violations">
        <ListItemText primary="All Violations" />
      </ListItem>
      <ListItem button component={Link} to="/view-hygiene-discipline">
        <ListItemText primary="Hygiene & Discipline" />
      </ListItem>
      <ListItem button component={Link} to="/view-final-competition-result">
        <ListItemText primary="Final Competition" />
      </ListItem>
    </List>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": { width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
}
