import { useEffect, useState } from "react";
import { Box, Typography, Stack } from "@mui/material";
import tetBg from "../assets/tet-bg.png";

export default function DashboardPage() {
  const holidayDate = new Date("2026-02-10T00:00:00");
  const tetDate = new Date("2026-02-17T00:00:00");

  const [holidayLeft, setHolidayLeft] = useState(getTimeRemaining(holidayDate));
  const [tetLeft, setTetLeft] = useState(getTimeRemaining(tetDate));
  const [celebrate, setCelebrate] = useState(false);

  function getTimeRemaining(target: Date) {
    const total = target.getTime() - new Date().getTime();
    return {
      total,
      days: Math.max(0, Math.floor(total / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((total / (1000 * 60 * 60)) % 24)),
      minutes: Math.max(0, Math.floor((total / (1000 * 60)) % 60)),
      seconds: Math.max(0, Math.floor((total / 1000) % 60)),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const holiday = getTimeRemaining(holidayDate);
      const tet = getTimeRemaining(tetDate);

      setHolidayLeft(holiday);
      setTetLeft(tet);

      if (tet.total <= 0) setCelebrate(true);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `url(${tetBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))",
        }}
      />

      <div className="flowers">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i}>🌸</span>
        ))}
      </div>

      <Stack
        spacing={4}
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          color: "white",
          px: 2,
        }}
      >
        <Typography className="title">
          🎆 ĐẾM NGƯỢC TẾT 2026 🎆
        </Typography>

        <CountdownCard
          title="🎓 Nghỉ Tết"
          time={holidayLeft}
        />

        <CountdownCard
          title="🧧 Mùng 1 Tết"
          time={tetLeft}
        />

        {celebrate && (
          <Typography className="celebrate">
            🎉 CHÚC MỪNG NĂM MỚI 🎉
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function CountdownCard({ title, time }: any) {
  return (
    <Box className="card">
      <Typography fontWeight="bold" mb={2}>
        {title}
      </Typography>

      <Stack direction="row" justifyContent="space-between">
        <TimeBox label="Ngày" value={time.days} />
        <TimeBox label="Giờ" value={time.hours} />
        <TimeBox label="Phút" value={time.minutes} />
        <TimeBox label="Giây" value={time.seconds} />
      </Stack>
    </Box>
  );
}

function TimeBox({ label, value }: any) {
  return (
    <Box className="timebox">
      <Typography className="number">{value}</Typography>
      <Typography fontSize={12}>{label}</Typography>
    </Box>
  );
}
