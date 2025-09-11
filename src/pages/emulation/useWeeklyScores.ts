import { useState, useEffect } from 'react';
import axios from 'axios';

export interface WeeklyScore {
  studentName: string;
  className: string;
  week: number;
  hygiene: number;
  attendance: number;
  discipline: number;
  totalScore: number;
}

export const useWeeklyScores = () => {
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await axios.get<WeeklyScore[]>('/api/weekly-scores'); // backend API
      setScores(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load weekly scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  return { scores, loading, error, refetch: fetchScores };
};
