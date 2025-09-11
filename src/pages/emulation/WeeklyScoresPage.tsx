import { useEffect, useState } from "react";
import axios from "axios";

// Interface WeeklyScore
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

// Interface Setting
interface Setting {
  disciplineMax: number;
}

export default function WeeklyScoresPage() {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const weeks: number[] = [1, 2, 3, 4]; // Chỉ dùng để render dropdown, không cần setWeeks
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [disciplineMax, setDisciplineMax] = useState<number>(100);

  // Lấy setting từ backend
  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const res = await axios.get<Setting>("/api/settings");
        setDisciplineMax(res.data.disciplineMax ?? 100);
      } catch (err) {
        console.error(err);
        alert("Không thể load setting, dùng mặc định 100");
      }
    };
    fetchSetting();
  }, []);

  // Load dữ liệu tuần
  const loadData = async () => {
    try {
      const res = await axios.get<WeeklyScore[]>(
        `/api/class-weekly-scores?weekNumber=${weekNumber}`
      );
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
      let newScores: WeeklyScore[] = scores.map((s) => {
        const totalViolation =
          disciplineMax -
          (s.violationScore + s.hygieneScore + s.attendanceScore + s.lineUpScore);
        const totalScore = totalViolation + s.academicScore + s.bonusScore;
        return { ...s, totalViolation, totalScore };
      });

      // Nhóm theo grade và xếp hạng
      const grouped: { [grade: string]: WeeklyScore[] } = {};
      newScores.forEach((s) => {
        if (!grouped[s.grade]) grouped[s.grade] = [];
        grouped[s.grade].push(s);
      });

      Object.keys(grouped).forEach((grade) => {
        grouped[grade].sort((a, b) => b.totalScore - a.totalScore);
        grouped[grade].forEach((s, i) => (s.rank = i + 1));
      });

      newScores = Object.values(grouped).flat();

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

  // Nhóm scores theo grade để hiển thị
  const groupedScores: { [grade: string]: WeeklyScore[] } = {};
  scores.forEach((s) => {
    if (!groupedScores[s.grade]) groupedScores[s.grade] = [];
    groupedScores[s.grade].push(s);
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>Điểm tuần {weekNumber}</h2>

      <div style={{ marginBottom: 10 }}>
        Tuần:{" "}
        <select
          value={weekNumber}
          onChange={(e) => setWeekNumber(Number(e.target.value))}
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              Tuần {w}
            </option>
          ))}
        </select>
      </div>

      <button onClick={loadData} disabled={loaded}>
        Load dữ liệu
      </button>
      <button onClick={saveData} style={{ marginLeft: 10 }}>
        Save dữ liệu
      </button>

      {Object.keys(groupedScores).map((grade) => (
        <div key={grade} style={{ marginTop: 30 }}>
          <h3>Khối {grade}</h3>
          <table
            border={1}
            cellPadding={5}
            style={{ borderCollapse: "collapse", width: "100%" }}
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
              {groupedScores[grade].map((s, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: s.rank === 1 ? "#d4edda" : "transparent", // highlight lớp đứng đầu
                  }}
                >
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
        </div>
      ))}
    </div>
  );
}
