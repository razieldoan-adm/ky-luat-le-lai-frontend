import React, { useEffect, useState } from "react";

interface WeeklyScore {
  className: string;
  grade: string;
  academicScore: number;
  bonusScore: number;
  violationScore: number;
  totalScore: number;
}

const WeeklyScoresPage: React.FC = () => {
  const [weeks, setWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy danh sách tuần
  useEffect(() => {
    fetch("https://ky-luat-le-lai-backend.onrender.com/api/weeks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWeeks(data);
          if (data.length > 0) setSelectedWeek(data[data.length - 1]); // chọn tuần mới nhất
        } else {
          setWeeks([]);
        }
      })
      .catch(() => setWeeks([]));
  }, []);

  // Lấy dữ liệu điểm theo tuần
  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    fetch(
      `https://ky-luat-le-lai-backend.onrender.com/api/class-violation-scores/week/${selectedWeek}`
    )
      .then((res) => res.json())
      .then((data) => {
        console.log("API trả về:", data); // debug
        if (Array.isArray(data)) {
          setScores(data);
        } else {
          setScores([]); // tránh lỗi .map
        }
      })
      .catch(() => setScores([]))
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Bảng điểm tuần</h2>

      {/* Dropdown chọn tuần */}
      <select
        value={selectedWeek}
        onChange={(e) => setSelectedWeek(Number(e.target.value))}
      >
        {weeks.map((w) => (
          <option key={w} value={w}>
            Tuần {w}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Khối</th>
              <th>Điểm học tập</th>
              <th>Điểm thưởng</th>
              <th>Điểm vi phạm</th>
              <th>Tổng điểm</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(scores) && scores.length > 0 ? (
              scores.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.className}</td>
                  <td>{s.grade}</td>
                  <td>{s.academicScore}</td>
                  <td>{s.bonusScore}</td>
                  <td>{s.violationScore}</td>
                  <td>{s.totalScore}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WeeklyScoresPage;
