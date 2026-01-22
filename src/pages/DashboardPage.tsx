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
            <span>{Number(value)}</span>
            <p>{key === "days" ? "Ngày" :
                key === "hours" ? "Giờ" :
                key === "minutes" ? "Phút" : "Giây"}</p>
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
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      minHeight: "100vh"
    }}
  >
      <div className="content">
        <h1 className="title">🎆 ĐẾM NGƯỢC TẾT 2026 🎆</h1>

        {renderBox("🎓 Nghỉ Tết (23/12 AL)", nghi)}
        {renderBox("🧧 Mùng 1 Tết", tet)}
      </div>

      <div className="liXi"></div>

      <style>{`
        .container {
          background: url('/tet-2026.jpg') no-repeat center center;
          background-size: cover;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .content {
          text-align: center;
          padding-top: 40px;
          animation: fadeIn 2s ease;
        }

        .title {
          font-size: 30px;
          font-weight: bold;
          background: linear-gradient(90deg, gold, orange, yellow);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 15px gold;
          margin-bottom: 20px;
        }

        .card {
          margin: 15px auto;
          padding: 20px;
          width: 90%;
          max-width: 400px;
          border-radius: 20px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
          color: white;
          animation: float 3s ease-in-out infinite;
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
          font-size: 26px;
          font-weight: bold;
          display: block;
          animation: flip 0.6s ease;
        }

        .timeBox p {
          font-size: 12px;
        }

        .liXi::before {
          content: "🧧 🧧 🧧 🧧 🧧";
          position: absolute;
          width: 100%;
          top: -50px;
          font-size: 28px;
          animation: fall 6s linear infinite;
        }

        @keyframes fall {
          0% { transform: translateY(0); }
          100% { transform: translateY(120vh); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }

        @keyframes flip {
          from { transform: rotateX(90deg); opacity: 0; }
          to { transform: rotateX(0); opacity: 1; }
        }

        @media (min-width: 768px) {
          .title { font-size: 40px; }
          .timeBox span { font-size: 36px; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
