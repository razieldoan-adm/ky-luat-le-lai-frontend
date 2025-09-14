import { AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

interface MainHeaderProps {
  onMenuClick?: () => void;
}

export default function MainHeader({ onMenuClick }: MainHeaderProps) {
  return (
    <AppBar position="fixed">
      <Toolbar>
        {onMenuClick && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" noWrap>
          School Management
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
