import { useState, useEffect } from 'react';
import axios from 'axios';

export interface WeeklyScore {
  studentName: string;
  className: string;
  week: number;
  hygiene: number;
  attendance: number;
  discipline: number;
  totalViolation: number;
  totalScore: number;
}

/**
 * Custom hook load điểm tuần theo week number.
 * Giữ nguyên dữ liệu load từ CSDL, không tính toán lại.
 */
export const useWeeklyScores = (week: number) => {
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/class-violation-scores/week/${week}`);
      if (Array.isArray(response.data)) {
        setScores(response.data);
      } else {
        console.error('API trả về không phải array:', response.data);
        setScores([]);
      }
      setError(null);
    } catch (err: any) {
      console.error('Lỗi khi fetch tuần:', err);
      setError(err.message || 'Failed to load weekly scores');
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [week]);

  return { scores, loading, error, refetch: fetchScores };
};
