import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";
import MainHeader from "../components/MainHeader";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <>
      <MainHeader />
      <Toolbar />
      <Box sx={{ display: "flex" }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Outlet /> {/* Nơi hiển thị các trang con */}
        </Box>
      </Box>
    </>
  );
}
