import React from 'react';
import { useWeeklyScores } from './useWeeklyScores';

const WeeklyScoresPage: React.FC = () => {
  const { scores, loading, error, refetch } = useWeeklyScores();

  if (loading) return <div>Loading weekly scores...</div>;
  if (error) return (
    <div>
      Error: {error} <button onClick={refetch}>Retry</button>
    </div>
  );

  return (
    <div>
      <h1>Weekly Scores</h1>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
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
    </div>
  );
};

export default WeeklyScoresPage;
