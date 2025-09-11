import React, { useState } from "react";
import axios from "axios";

interface WeeklyScore {
  className: string;
  grade: string;
  weekNumber: number;
  academicScore: number;
  violationScore: number;
  hygieneScore: number;
  attendanceScore: number;
  lineUpScore: number;
  bonusScore: number;
  totalViolation?: number;
  totalScore?: number;
  rank?: number;
}

const WEEK_MAX_DISCIPLINE = 100; // Max kỷ luật để tính tổng nề nếp

export default function WeeklyScorePage() {
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [loaded, setLoaded] = useState(false);
  
  

  const loadData = async () => {
  try {
    // Gọi API và khai báo kiểu dữ liệu cho TypeScript
    const res = await axios.get<WeeklyScore[]>(`/api/class-weekly-scores?weekNumber=${weekNumber}`);
    setScores(res.data);  // Lưu dữ liệu vào state scores
    setLoaded(true);      // Disable button load
  } catch (err) {
    console.error(err);
  }
};
  
  const saveData = async () => {
  // Tính tổng nề nếp và tổng để xếp hạng
  let newScores = scores.map(s => {
    const totalViolation = WEEK_MAX_DISCIPLINE - (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
    const totalScore = totalViolation + s.academicScore + s.bonusScore;
    return { ...s, totalViolation, totalScore };
  });

  // Tự động xếp hạng theo grade
  const grouped: { [grade: string]: WeeklyScore[] } = {};
    scores.forEach(s => {
  if (!grouped[s.grade]) grouped[s.grade] = [];
    grouped[s.grade].push(s);
  });

  Object.keys(grouped).forEach((grade: string) => {
  grouped[grade].sort((a: WeeklyScore, b: WeeklyScore) => b.totalScore! - a.totalScore!);
  grouped[grade].forEach((s: WeeklyScore, i: number) => s.rank = i + 1);
});

  // Flatten lại mảng scores
  newScores = Object.values(grouped).flat();

  // Lưu lại CSDL
  try {
    await axios.post("/api/class-weekly-scores/save", {
      weekNumber,
      scores: newScores
    });
    alert("Saved successfully!");
    setScores(newScores);
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div style={{ padding: 20 }}>
      <h2>Điểm tuần {weekNumber}</h2>
      <div style={{ marginBottom: 10 }}>
        Tuần:{" "}
        <input
          type="number"
          value={weekNumber}
          min={1}
          onChange={e => setWeekNumber(Number(e.target.value))}
        />
      </div>
      <button onClick={loadData} disabled={loaded}>Load dữ liệu</button>
      <button onClick={saveData} style={{ marginLeft: 10 }}>Save dữ liệu</button>

      {scores.length > 0 && (
        <table border="1" cellPadding="5" style={{ marginTop: 20, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Kỷ luật</th>
              <th>Vệ sinh</th>
              <th>Chuyên cần</th>
              <th>Xếp hàng</th>
              <th>Điểm học tập</th>
              <th>Điểm thưởng</th>
              <th>Tổng nề nếp</th>
              <th>Tổng để xếp hạng</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, idx) => (
              <tr key={idx}>
                <td>{s.className}</td>
                <td>{s.violationScore}</td>
                <td>{s.hygieneScore}</td>
                <td>{s.attendanceScore}</td>
                <td>{s.lineUpScore}</td>
                <td>{s.academicScore}</td>
                <td>{s.bonusScore}</td>
                <td>{s.totalViolation}</td>
                <td>{s.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
