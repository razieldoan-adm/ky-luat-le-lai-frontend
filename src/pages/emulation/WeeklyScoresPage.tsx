import React, { useState } from 'react';
import { useWeeklyScores } from './useWeeklyScores';

const WeeklyScoresPage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const { scores, loading, error, refetch } = useWeeklyScores(selectedWeek);

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(Number(e.target.value));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Weekly Scores</h1>

      {/* Dropdown chọn tuần */}
      <div style={{ marginBottom: '20px' }}>
        <label>
          Chọn tuần:{' '}
          <select value={selectedWeek} onChange={handleWeekChange}>
            {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>
                Tuần {week}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Loading / Error / No data */}
      {loading && <div>Loading weekly scores...</div>}
      {error && (
        <div>
          Lỗi: {error}{' '}
          <button onClick={refetch} style={{ marginLeft: '10px' }}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && scores.length === 0 && <div>Không có dữ liệu cho tuần {selectedWeek}</div>}

      {/* Table */}
      {!loading && !error && scores.length > 0 && (
        <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Week</th>
              <th>Hygiene</th>
              <th>Attendance</th>
              <th>Discipline</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score, index) => (
              <tr key={index}>
                <td>{score.studentName}</td>
                <td>{score.className}</td>
                <td>{score.week}</td>
                <td>{score.hygiene}</td>
                <td>{score.attendance}</td>
                <td>{score.discipline}</td>
                <td>{score.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WeeklyScoresPage;
