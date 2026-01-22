import { useEffect, useState } from "react";
import tetMobile from "../assets/tet-mobile.jpg";
import tetPC from "../assets/tet-pc.jpg";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const DashboardPage = () => {
  const getTimeLeft = (targetDate: Date): TimeLeft => {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0)
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((distance / (1000 * 60)) % 60),
      seconds: Math.floor((distance / 1000) % 60),
    };
  };

  const tetDate = new Date("2026-02-17T00:00:00");
  const nghiTet = new Date("2026-02-10T00:00:00");

  const [isMobile, setIsMobile] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);

  const [tet, setTet] = useState<TimeLeft>(getTimeLeft(tetDate));
  const [nghi, setNghi] = useState<TimeLeft>(getTimeLeft(nghiTet));

  useEffect(() => {
    const timer = setInterval(() => {
      setTet(getTimeLeft(tetDate));
      setNghi(getTimeLeft(nghiTet));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const renderBox = (title: string, time: TimeLeft) => (
    <div className="card">
      <h2>{title}</h2>
      <div className="countdown">
        {Object.entries(time).map(([key, value]) => (
          <div key={key} className="timeBox">
            <span>{value}</span>
            <p>
              {key === "days"
                ? "Ngày"
                : key === "hours"
                ? "Giờ"
                : key === "minutes"
                ? "Phút"
                : "Giây"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="container"
      style={{
        backgroundImage: `url(${isMobile ? tetMobile : tetPC})`,
      }}
    >
      <button
        className="toggleBtn"
        onClick={() => setShowCountdown(!showCountdown)}
      >
        {showCountdown ? "👁 Ẩn" : "🎆 Hiện"}
      </button>

      {showCountdown && (
        <div className="content">
          <div className="countdownWrapper">
            {renderBox("🎓 Nghỉ Tết (23/12 AL)", nghi)}
            {renderBox("🧧 Mùng 1 Tết", tet)}
          </div>
        </div>
      )}

      <style>{`
        .container {
          min-height: 100vh;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          position: relative;
          overflow: hidden;
        }

        .content {
          padding-top: 60px;
          display: flex;
          justify-content: center;
          animation: fadeIn 1s ease;
        }

        .countdownWrapper {
          display: flex;
          gap: 40px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .card {
          padding: 25px;
          width: 320px;
          border-radius: 20px;

          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);

          border: 1px solid rgba(255,255,255,0.15);

          color: white;
          text-align: center;
        }

        .card h2 {
          margin-bottom: 15px;
          font-size: 18px;
        }

        .countdown {
          display: flex;
          justify-content: space-between;
        }

        .timeBox span {
          font-size: 28px;
          font-weight: bold;
          color: gold;
          text-shadow: 0 0 8px orange;
        }

        .timeBox p {
          font-size: 12px;
        }

        .toggleBtn {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
          background: rgba(0,0,0,0.3);
          color: white;
          font-weight: bold;
          backdrop-filter: blur(5px);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .countdownWrapper {
            flex-direction: column;
            gap: 20px;
          }

          .card {
            width: 85%;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
