import { useEffect, useState } from "react";
import { Box, Typography, Stack, Card } from "@mui/material";
import tetBg from "../assets/tet-bg.png";

export default function Dashboard() {
  // 🎯 ĐỔI 2 MỐC THỜI GIAN Ở ĐÂY
  const holidayDate = new Date("2026-02-10T00:00:00"); // 23/12 AL (ví dụ)
  const tetDate = new Date("2026-02-17T00:00:00"); // Mùng 1 Tết 2026

  const [holidayLeft, setHolidayLeft] = useState(getTimeRemaining(holidayDate));
  const [tetLeft, setTetLeft] = useState(getTimeRemaining(tetDate));

  function getTimeRemaining(target: Date) {
    const total = target.getTime() - new Date().getTime();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setHolidayLeft(getTimeRemaining(holidayDate));
      setTetLeft(getTimeRemaining(tetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        height: "100vh",
        backgroundImage: `url(${tetBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        backdropFilter: "brightness(0.9)",
      }}
    >
      <Typography
        variant="h3"
        fontWeight="bold"
        sx={{ color: "white", textShadow: "2px 2px 10px black", mb: 5 }}
      >
        🎆 ĐẾM NGƯỢC TẾT 2026 🎆
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={5}>
        <CountdownCard
          title="🎓 Nghỉ Tết (23/12 AL)"
          time={holidayLeft}
        />
        <CountdownCard
          title="🧧 Mùng 1 Tết"
          time={tetLeft}
        />
      </Stack>
    </Box>
  );
}

function CountdownCard({ title, time }: any) {
  return (
    <Card
      sx={{
        p: 4,
        background: "rgba(0,0,0,0.6)",
        color: "white",
        borderRadius: 4,
        minWidth: 280,
        textAlign: "center",
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <Stack direction="row" spacing={3} justifyContent="center">
        <TimeBox label="Ngày" value={time.days} />
        <TimeBox label="Giờ" value={time.hours} />
        <TimeBox label="Phút" value={time.minutes} />
        <TimeBox label="Giây" value={time.seconds} />
      </Stack>
    </Card>
  );
}

function TimeBox({ label, value }: any) {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="caption">{label}</Typography>
    </Box>
  );
}
