import { useEffect, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";

export default function Dashboard() {
  // 👉 Bạn có thể đổi ngày Tết tại đây
  const targetDate = new Date("2026-02-17T00:00:00");

  const [timeLeft, setTimeLeft] = useState(getTimeRemaining());
  const [themeColor, setThemeColor] = useState("#d32f2f"); // màu chủ đạo

  function getTimeRemaining() {
    const total = targetDate.getTime() - new Date().getTime();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        height: "100vh",
        background: "linear-gradient(to bottom, #b71c1c, #ffcc80)",
        color: "white",
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 🎇 Hoa rơi */}
      {Array.from({ length: 30 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            top: "-10px",
            left: `${Math.random() * 100}%`,
            fontSize: "20px",
            animation: `fall ${5 + Math.random() * 5}s linear infinite`,
          }}
        >
          🌸
        </Box>
      ))}

      {/* Nội dung chính */}
      <Box sx={{ pt: 10 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          🎆 ĐẾM NGƯỢC TỚI TẾT 2026 🎆
        </Typography>

        <Stack direction="row" spacing={4} justifyContent="center" mt={5}>
          <TimeBox label="Ngày" value={timeLeft.days} color={themeColor} />
          <TimeBox label="Giờ" value={timeLeft.hours} color={themeColor} />
          <TimeBox label="Phút" value={timeLeft.minutes} color={themeColor} />
          <TimeBox label="Giây" value={timeLeft.seconds} color={themeColor} />
        </Stack>

        {/* Nút đổi màu */}
        <Stack direction="row" spacing={2} justifyContent="center" mt={5}>
          <Button
            variant="contained"
            onClick={() => setThemeColor("#d32f2f")}
          >
            Đỏ
          </Button>
          <Button
            variant="contained"
            onClick={() => setThemeColor("#2e7d32")}
          >
            Xanh
          </Button>
          <Button
            variant="contained"
            onClick={() => setThemeColor("#f9a825")}
          >
            Vàng
          </Button>
        </Stack>
      </Box>

      {/* CSS animation */}
      <style>
        {`
          @keyframes fall {
            0% { transform: translateY(0); }
            100% { transform: translateY(110vh); }
          }
        `}
      </style>
    </Box>
  );
}

function TimeBox({ label, value, color }: any) {
  return (
    <Box
      sx={{
        backgroundColor: color,
        padding: 4,
        borderRadius: 3,
        minWidth: 100,
      }}
    >
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
      <Typography>{label}</Typography>
    </Box>
  );
}
