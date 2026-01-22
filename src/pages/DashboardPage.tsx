import React, { useEffect, useState } from "react";

const DashboardPage = () => {
  const getTimeLeft = (targetDate: Date) => {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((distance / (1000 * 60)) % 60),
      seconds: Math.floor((distance / 1000) % 60),
    };
  };

  // ⚠️ ĐỔI LẠI đúng ngày Tết 2026 nếu cần
  const tetDate = new Date("2026-02-17T00:00:00");
  const nghiTet = new Date("2026-02-10T00:00:00"); // 23/12 AL

  const [timeTet, setTimeTet] = useState(getTimeLeft(tetDate));
  const [timeNghi, setTimeNghi] = useState(getTimeLeft(nghiTet));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTet(getTimeLeft(tetDate));
      setTimeNghi(getTimeLeft(nghiTet));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const renderBox = (label: string, time: any) => (
    <div className="card">
      <h2>{label}</h2>
      <div className="countdown">
        <div><span>{time.days}</span><p>Ngày</p></div>
        <div><span>{time.hours}</span><p>Giờ</p></div>
        <div><span>{time.minutes}</span><p>Phút</p></div>
        <div><span>{time.seconds}</span><p>Giây</p></div>
      </div>
    </div>
  );

  return (
    <div className="tet-container">
      <div className="overlay">
        <h1 className="title">🎆 ĐẾM NGƯỢC TẾT 2026 🎆</h1>

        {renderBox("🎓 Nghỉ Tết (23/12 AL)", timeNghi)}
        {renderBox("🧧 Mùng 1 Tết", timeTet)}
      </div>

      <style>{`
        .tet-container {
          background-image: url('/tet-bg.png');
          background-size: cover;
          background-position: center;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .overlay {
          text-align: center;
          padding-top: 80px;
          animation: fadeIn 2s ease;
        }

        .title {
          font-size: 48px;
          font-weight: bold;
          background: linear-gradient(90deg, gold, orange, yellow);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 2px 2px 10px black;
          margin-bottom: 40px;
          animation: glow 2s infinite alternate;
        }

        .card {
          margin: 20px auto;
          padding: 25px;
          width: 85%;
          max-width: 600px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          color: white;
          animation: float 3s ease-in-out infinite;
        }

        .card h2 {
          margin-bottom: 20px;
          font-size: 26px;
        }

        .countdown {
          display: flex;
          justify-content: space-around;
        }

        .countdown div span {
          font-size: 40px;
          font-weight: bold;
          display: block;
        }

        .countdown div p {
          margin-top: 5px;
          font-size: 14px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glow {
          from { text-shadow: 0 0 10px gold; }
          to { text-shadow: 0 0 25px orange; }
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
