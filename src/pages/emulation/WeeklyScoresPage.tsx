// src/pages/emulation/WeeklyScoresPage.tsx
import { useState } from "react";
import axios from "axios";

const WEEK_MAX_DISCIPLINE = 100; // Giá trị tối đa để tính tổng nề nếp

// Interface chuẩn cho WeeklyScore
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
  totalViolation: number;
  totalScore: number;
  rank?: number;
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Load dữ liệu từ backend
  const loadData = async () => {
    try {
      const res = await axios.get<WeeklyScore[]>(
        `/api/class-weekly-scores?weekNumber=${weekNumber}`
      );
      // Điền giá trị default nếu undefined
      const filledScores = res.data.map((s) => ({
        ...s,
        totalViolation: s.totalViolation ?? 0,
        totalScore: s.totalScore ?? 0,
      }));
      setScores(filledScores);
      setLoaded(true);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi load dữ liệu!");
    }
  };

  // Save dữ liệu + tính tổng + auto xếp hạng
  const saveData = async () => {
    try {
      // Tính tổng nề nếp và tổng để xếp hạng
      let newScores: WeeklyScore[] = scores.map((s) => {
        const totalViolation =
          WEEK_MAX_DISCIPLINE -
          (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
        const totalScore = totalViolation + s.academicScore + s.bonusScore;
        return { ...s, totalViolation, totalScore };
      });

      // Tự động xếp hạng theo grade
      const grouped: { [grade: string]: WeeklyScore[] } = {};
      newScores.forEach((s) => {
        if (!grouped[s.grade]) grouped[s.grade] = [];
        grouped[s.grade].push(s);
      });

      Object.keys(grouped).forEach((grade) => {
        grouped[grade].sort((a, b) => b.totalScore - a.totalScore);
        grouped[grade].forEach((s, i) => (s.rank = i + 1));
      });

      // Flatten lại mảng
      newScores = Object.values(grouped).flat();

      // Gửi lên backend
      await axios.post("/api/class-weekly-scores/save", {
        weekNumber,
        scores: newScores,
      });

      setScores(newScores);
      alert("Đã lưu dữ liệu thành công!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu dữ liệu!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Điểm tuần {weekNumber}</h2>
      <div style={{ marginBottom: 10 }}>
        Tuần:{" "}
        <input
          type="number"
          min={1}
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
        />
      </div>
      <button onClick={loadData} disabled={loaded}>
        Load dữ liệu
      </button>
      <button onClick={saveData} style={{ marginLeft: 10 }}>
        Save dữ liệu
      </button>

      {scores.length > 0 && (
        <table
          border={1}
          cellPadding={5}
          style={{ marginTop: 20, borderCollapse: "collapse" }}
        >
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
              <th>Thứ hạng</th>
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
                <td>{s.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
